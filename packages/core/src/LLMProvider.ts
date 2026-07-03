import type { VisionDecision } from './types.js';

export interface LLMProviderConfig {
  apiKey: string;
  model: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
}

export interface LLMRequest {
  prompt: string;
  imageBase64?: string;
  imageMimeType?: string;
  previousImageBase64?: string;
}

export interface LLMResponse {
  raw: string;
  parsed: VisionDecision;
}

export interface LLMProvider {
  readonly name: string;
  generate(request: LLMRequest): Promise<LLMResponse>;
}
