// cli/src/agent/BrowserPool.ts

import { chromium, Browser, BrowserContext, Page } from 'playwright';

// ── Types ────────────────────────────────────────────────────────────

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

// ── Pool Internals ───────────────────────────────────────────────────

interface PooledBrowser {
  browser: Browser;
  contexts: Map<string, BrowserContext>;
  pages: Map<string, Page>;
  lastUsed: Date;
}

// ── BrowserPool ──────────────────────────────────────────────────────

export class BrowserPool {
  private browsers: Map<string, PooledBrowser> = new Map();
  private config: Required<BrowserPoolConfig>;
  private usageCount = 0;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config: BrowserPoolConfig = {}) {
    this.config = {
      maxBrowsers: config.maxBrowsers ?? 5,
      maxPagesPerBrowser: config.maxPagesPerBrowser ?? 10,
      launchOptions: config.launchOptions ?? {},
      persistent: config.persistent ?? false,
    };

    this.startCleanupInterval();
  }

  async initialize(minBrowsers = 1): Promise<void> {
    for (let i = 0; i < Math.min(minBrowsers, this.config.maxBrowsers); i++) {
      await this.createBrowser();
    }
  }

  async acquirePage(options: {
    headless?: boolean;
    proxy?: ProxyConfig;
    viewport?: ViewportConfig;
    userAgent?: string;
  } = {}): Promise<{ page: Page; release: () => Promise<void> }> {
    const { headless = true, proxy, viewport, userAgent } = options;

    let pooledBrowser = this.findAvailableBrowser();
    
    if (!pooledBrowser) {
      if (this.browsers.size >= this.config.maxBrowsers) {
        throw new Error('Browser pool exhausted: max browsers reached');
      }
      pooledBrowser = await this.createBrowser({ headless, proxy });
    }

    const contextId = `ctx_${++this.usageCount}`;
    const context = await pooledBrowser.browser.newContext({
      viewport: viewport ?? { width: 1920, height: 1080 },
      userAgent,
      proxy: proxy ? {
        server: proxy.server,
        username: proxy.username,
        password: proxy.password,
      } : undefined,
    });

    pooledBrowser.contexts.set(contextId, context);

    const pageId = `page_${++this.usageCount}`;
    const page = await context.newPage();
    pooledBrowser.pages.set(pageId, page);

    page.on('close', () => {
      // Handle close
    });

    page.on('pageerror', (err: Error) => {
      console.error(`Page error event: ${err.message}`);
    });

    const release = async () => {
      try {
        await page.close();
        pooledBrowser!.pages.delete(pageId);
        
        await context.close();
        pooledBrowser!.contexts.delete(contextId);
      } catch (err) {
        console.error('Error releasing page:', err);
      }
    };

    pooledBrowser.lastUsed = new Date();
    return { page, release };
  }

  private async createBrowser(options: { headless?: boolean; proxy?: ProxyConfig } = {}): Promise<PooledBrowser> {
    const browserId = `browser_${++this.usageCount}`;
    
    const browser = await chromium.launch({
      headless: options.headless ?? true,
      ...this.config.launchOptions,
    });

    const pooledBrowser: PooledBrowser = {
      browser,
      contexts: new Map(),
      pages: new Map(),
      lastUsed: new Date(),
    };

    this.browsers.set(browserId, pooledBrowser);
    return pooledBrowser;
  }

  private findAvailableBrowser(): PooledBrowser | undefined {
    for (const [, pooledBrowser] of this.browsers) {
      if (pooledBrowser.pages.size < this.config.maxPagesPerBrowser) {
        return pooledBrowser;
      }
    }
    return undefined;
  }

  getStats(): { browsers: number; contexts: number; pages: number } {
    let contexts = 0;
    let pages = 0;
    
    for (const [, pooledBrowser] of this.browsers) {
      contexts += pooledBrowser.contexts.size;
      pages += pooledBrowser.pages.size;
    }

    return { browsers: this.browsers.size, contexts, pages };
  }

  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleBrowsers();
    }, 60000);
  }

  private cleanupIdleBrowsers(maxIdleMs = 300000): void {
    const now = Date.now();
    
    for (const [id, pooledBrowser] of this.browsers) {
      if (pooledBrowser.pages.size === 0 && now - pooledBrowser.lastUsed.getTime() > maxIdleMs) {
        pooledBrowser.browser.close().catch(console.error);
        this.browsers.delete(id);
      }
    }
  }

  async dispose(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    const closePromises: Promise<void>[] = [];
    
    for (const [, pooledBrowser] of this.browsers) {
      for (const [, page] of pooledBrowser.pages) {
        closePromises.push(page.close());
      }
      
      for (const [, context] of pooledBrowser.contexts) {
        closePromises.push(context.close());
      }
      
      closePromises.push(pooledBrowser.browser.close());
    }

    await Promise.allSettled(closePromises);
    this.browsers.clear();
  }
}
