// cli/src/agent/VisionClient.ts

import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import type { AgentConfig, PageContext, VisionDecision } from './types.js';

export class VisionClient {
  private model;

  constructor(config: AgentConfig) {
    if (!config.apiKey) {
      throw new Error('Gemini API key is required. Set GOOGLE_API_KEY or GEMINI_API_KEY.');
    }

    const genAI = new GoogleGenerativeAI(config.apiKey);

    this.model = genAI.getGenerativeModel({
      model: config.model ?? 'gemini-2.5-flash',
      generationConfig: {
        temperature: config.temperature ?? 0.2,
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            thought: {
              type: SchemaType.STRING,
              description: 'Your analysis of the current state and reasoning for the next action',
            },
            action: {
              type: SchemaType.OBJECT,
              properties: {
                type: {
                  type: SchemaType.STRING,
                  description: 'The type of action to perform: click, type, scroll, wait, navigate, done, or fail',
                },
                x: {
                  type: SchemaType.NUMBER,
                  description: 'X pixel coordinate of the target element center in the screenshot',
                },
                y: {
                  type: SchemaType.NUMBER,
                  description: 'Y pixel coordinate of the target element center in the screenshot',
                },
                text: {
                  type: SchemaType.STRING,
                  description: 'Text to type (for type action)',
                },
                direction: {
                  type: SchemaType.STRING,
                  description: 'Scroll direction: up, down, left, or right',
                },
                amount: {
                  type: SchemaType.NUMBER,
                  description: 'Scroll amount in pixels',
                },
                url: {
                  type: SchemaType.STRING,
                  description: 'URL to navigate to (for navigate action)',
                },
                reason: {
                  type: SchemaType.STRING,
                  description: 'Explanation of why this action was taken',
                },
              },
              required: ['type'],
            },
          },
          required: ['thought', 'action'],
        },
      },
    });
  }

  async decideNextAction(
    instruction: string,
    context: PageContext,
    actionHistory: string[],
    remainingSteps: number,
  ): Promise<VisionDecision> {
    const prompt = this.buildPrompt(instruction, context, actionHistory, remainingSteps);
    const content = [
      prompt,
      {
        inlineData: {
          mimeType: 'image/jpeg' as const,
          data: context.screenshotBase64,
        },
      },
    ];

    // Retry with exponential backoff for transient API errors (503, rate limits)
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.model.generateContent(content);
        return this.parseResponse(result.response.text());
      } catch (error) {
        const message = (error as Error).message || '';
        const isRetryable = message.includes('503') || message.includes('429') || message.includes('overloaded');

        if (isRetryable && attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        throw error;
      }
    }

    throw new Error('Unreachable');
  }

  // ── Private ──────────────────────────────────────────────────────

  private buildPrompt(
    instruction: string,
    context: PageContext,
    actionHistory: string[],
    remainingSteps: number,
  ): string {
    return `You are an autonomous QA testing agent that interacts with web pages using VISUAL PERCEPTION. You look at a screenshot and decide where to click by identifying pixel coordinates — you do NOT use CSS selectors or DOM queries.

**USER'S INSTRUCTION:**
"${instruction}"

**CURRENT STATE:**
- Page Title: ${context.pageTitle}
- URL: ${context.currentUrl}
- Viewport: 1920×1080
- Remaining Steps: ${remainingSteps}

**VISIBLE ELEMENTS (supplementary context):**
${context.visibleElements.join('\n') || 'No interactive elements detected via DOM scan'}

**ACTION HISTORY:**
${actionHistory.length === 0 ? 'No actions taken yet.' : actionHistory.map((a, i) => `${i + 1}. ${a}`).join('\n')}

**INSTRUCTIONS:**
1. Study the screenshot carefully to understand what is visible on screen
2. Identify the element you need to interact with by its visual appearance and position
3. Estimate the CENTER (x, y) pixel coordinates of that element in the screenshot
4. Choose ONE action from: click, type, scroll, wait, navigate, done, fail

**ACTION GUIDELINES:**
- click: Provide the (x, y) center of the element you want to click
- type: Provide the (x, y) center of the input field, plus the text to type. The field will be clicked first, then the text will be entered
- scroll: Specify direction (up/down/left/right) and amount in pixels
- wait: Use when the page is loading or needs time to settle
- navigate: Provide a full URL to navigate to
- done: Use when the task is fully and successfully completed. Include a message summarizing the result
- fail: Use only when the task genuinely cannot be completed

**COORDINATE RULES:**
- The screenshot is exactly 1920×1080 pixels
- (0, 0) is the top-left corner
- Estimate the CENTER of the target element, not its edge
- Be precise — a click at the wrong coordinates will miss the target
- If you can't complete the task after reasonable attempts, use "fail"`;
  }

  private parseResponse(responseText: string): VisionDecision {
    try {
      return JSON.parse(responseText);
    } catch {
      const jsonMatch =
        responseText.match(/```json\n?([\s\S]*?)\n?```/) ||
        responseText.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        return JSON.parse(jsonMatch[1] || jsonMatch[0]);
      }

      throw new Error('Failed to parse AI response');
    }
  }
}
