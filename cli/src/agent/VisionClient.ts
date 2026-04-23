// cli/src/agent/VisionClient.ts

import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import type { AgentConfig, Action, PageContext, VisionDecision } from './types.js';

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
                selector: {
                  type: SchemaType.STRING,
                  description: 'CSS selector for the element to interact with (for click, type)',
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

    const result = await this.model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: context.screenshotBase64,
        },
      },
    ]);

    return this.parseResponse(result.response.text());
  }

  // ── Private ──────────────────────────────────────────────────────

  private buildPrompt(
    instruction: string,
    context: PageContext,
    actionHistory: string[],
    remainingSteps: number,
  ): string {
    return `You are an autonomous QA testing agent. Analyze the current page state and decide the next action to complete the user's instruction.

**USER'S INSTRUCTION:**
"${instruction}"

**CURRENT STATE:**
- Page Title: ${context.pageTitle}
- URL: ${context.currentUrl}
- Remaining Steps: ${remainingSteps}

**PAGE ELEMENTS:**
${context.visibleElements.join('\n') || 'No visible interactive elements detected'}

**ACTION HISTORY:**
${actionHistory.length === 0 ? 'No actions taken yet.' : actionHistory.map((a, i) => `${i + 1}. ${a}`).join('\n')}

**INSTRUCTIONS:**
1. Analyze the screenshot and visible elements to understand the current state
2. Identify what needs to be done to complete the task
3. Choose ONE action from: click, type, scroll, wait, navigate, done, fail

**ACTION GUIDELINES:**
- click: Use a specific, stable CSS selector. Prefer ID or unique class.
- type: Provide both selector and text to type
- scroll: Specify direction (up/down) and amount in pixels
- wait: Use when page is loading or after an action needs time to complete
- navigate: Provide full URL to navigate to
- done: Use when the task is successfully completed
- fail: Use only when the task cannot be completed (e.g., blocked, missing elements)

**IMPORTANT:**
- Respond ONLY with the JSON format specified
- Choose the most specific selector possible
- If you can't complete the task after reasonable attempts, use "fail"
- The viewport is 1920x1080, elements below the fold may require scrolling`;
  }

  private parseResponse(responseText: string): VisionDecision {
    try {
      return JSON.parse(responseText);
    } catch {
      // Fallback: extract JSON from markdown fences
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
