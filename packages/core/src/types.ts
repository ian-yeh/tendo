import type { Page } from 'playwright';

export interface AgentConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
}

export type ActionType =
  | 'click'
  | 'type'
  | 'key'
  | 'evaluate'
  | 'scroll'
  | 'wait'
  | 'navigate'
  | 'screenshot'
  | 'done'
  | 'fail';

export type Action =
  | { type: 'click'; x: number; y: number; reason?: string }
  | { type: 'type'; x: number; y: number; text: string; reason?: string }
  | { type: 'key'; key: string; reason?: string }
  | { type: 'evaluate'; script: string; reason?: string }
  | { type: 'scroll'; direction?: 'up' | 'down' | 'left' | 'right'; amount?: number; reason?: string }
  | { type: 'wait'; amount?: number; reason?: string }
  | { type: 'navigate'; url: string; reason?: string }
  | { type: 'screenshot'; reason?: string }
  | { type: 'done'; reason?: string }
  | { type: 'fail'; message: string };

export interface AgentState {
  page: Page;
  currentUrl: string;
  step: number;
  actions: string[];
  screenshots: string[];
  plan: string[];
  completed: boolean;
  success: boolean;
}

export interface PageContext {
  screenshotBase64: string;
  pageTitle: string;
  currentUrl: string;
  visibleElements: string[];
}

export interface VisionDecision {
  thought: string;
  action: Action;
}

export interface TestResult {
  success: boolean;
  url: string;
  prompt: string;
  steps: number;
  actions: Record<string, unknown>[];
  finalUrl: string;
  timestamp: string;
  screenshots?: string[];
}
