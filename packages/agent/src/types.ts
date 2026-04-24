import type { ViewportConfig } from '@tendo/browser';

export interface RunOptions {
  url: string;
  prompt: string;
  maxSteps?: number;
  headless?: boolean;
  viewport?: ViewportConfig;
}
