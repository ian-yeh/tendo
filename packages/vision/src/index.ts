import type { LLMProvider, PageContext, VisionDecision } from '@tendo/core';
import { PromptEngine } from '@tendo/prompt-engine';
import { PageAnalyzer, type PageSummary } from './PageAnalyzer.js';

export { GeminiProvider } from './providers/gemini.js';
export { GroqProvider } from './providers/groq.js';

export class VisionClient {
  private promptEngine: PromptEngine;
  private analyzer: PageAnalyzer;

  constructor(private provider: LLMProvider) {
    this.promptEngine = new PromptEngine();
    this.analyzer = new PageAnalyzer();
  }

  getPageSummary(context: PageContext): PageSummary {
    return this.analyzer.analyzePageState(context);
  }

  async planNextSteps(
    instruction: string,
    context: PageContext,
  ): Promise<string[]> {
    const pageSummary = this.getPageSummary(context);
    const summaryText = `Type: ${pageSummary.type}. ${pageSummary.description}`;
    const prompt = this.promptEngine.buildPlanningPrompt(instruction, context, summaryText);

    const response = await this.provider.generate({
      prompt,
      imageBase64: context.screenshotBase64,
      imageMimeType: 'image/jpeg',
    });

    const parsed = response.parsed as any;
    if (parsed.steps && Array.isArray(parsed.steps)) {
      return parsed.steps;
    }
    return [];
  }

  async decideNextAction(
    instruction: string,
    context: PageContext,
    actionHistory: string[],
    remainingSteps: number,
    warnings: string[] = [],
    previousScreenshot?: string,
    plan: string[] = [],
  ): Promise<VisionDecision> {
    const pageSummary = this.getPageSummary(context);
    const summaryText = `Type: ${pageSummary.type}. ${pageSummary.description}`;
    const prompt = this.promptEngine.buildPrompt(instruction, context, actionHistory, remainingSteps, warnings, plan, summaryText);

    const response = await this.provider.generate({
      prompt,
      imageBase64: context.screenshotBase64,
      imageMimeType: 'image/jpeg',
      previousImageBase64: previousScreenshot,
    });

    return response.parsed;
  }
}
