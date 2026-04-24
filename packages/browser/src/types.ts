import type { Browser, BrowserContext, Page } from 'playwright';

export interface BrowserPoolConfig {
  maxBrowsers?: number;
  maxPagesPerBrowser?: number;
  launchOptions?: Record<string, unknown>;
  persistent?: boolean;
}

export interface ProxyConfig {
  server: string;
  username?: string;
  password?: string;
}

export interface ViewportConfig {
  width: number;
  height: number;
}

export interface AcquirePageOptions {
  headless?: boolean;
  proxy?: ProxyConfig;
  viewport?: ViewportConfig;
  userAgent?: string;
}

export interface PageInteractorOptions {
  headless?: boolean;
  viewport?: ViewportConfig;
}

export interface PooledBrowser {
  browser: Browser;
  contexts: Map<string, BrowserContext>;
  pages: Map<string, Page>;
  lastUsed: Date;
}

export interface PageRelease {
  page: Page;
  release: () => Promise<void>;
}
