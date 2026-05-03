import { chromium } from 'playwright';
import { BrowserPoolConfig, ProxyConfig, PooledBrowser, AcquirePageOptions, PageRelease } from './types.js';

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

  async acquirePage(options: AcquirePageOptions = {}): Promise<PageRelease> {
    const { headless = true, proxy, viewport, userAgent } = options;
    let pooledBrowser = this.findAvailableBrowser();

    if (!pooledBrowser) {
      if (this.browsers.size >= this.config.maxBrowsers) {
        throw new Error('Browser pool exhausted');
      }
      pooledBrowser = await this.createBrowser({ headless, proxy });
    }

    const contextId = `ctx_${++this.usageCount}`;
    const context = await pooledBrowser.browser.newContext({
      viewport: viewport ?? { width: 1280, height: 720 },
      userAgent,
      proxy: proxy ? {
        server: proxy.server,
        username: proxy.username,
        password: proxy.password,
      } : undefined,
    });

    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });
    pooledBrowser.contexts.set(contextId, context);
    const pageId = `page_${++this.usageCount}`;
    const page = await context.newPage();
    pooledBrowser.pages.set(pageId, page);

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
      args: ['--disable-blink-features=AutomationControlled'],
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
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
    const closePromises: Promise<any>[] = [];
    for (const [, pooledBrowser] of this.browsers) {
      closePromises.push(pooledBrowser.browser.close());
    }
    await Promise.allSettled(closePromises);
    this.browsers.clear();
  }
}
