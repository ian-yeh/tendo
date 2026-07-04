import type { Page } from 'playwright';
import type {
  ElementInfo,
  LookPayload,
  ConsoleErrorInfo,
  FailedRequestInfo,
  CaptureOptions,
  ActResult,
  Clause,
} from '@tendo/core';
import path from 'node:path';
import fs from 'node:fs/promises';
import sharp from 'sharp';

const MAX_DIAGNOSTICS = 10;

/** Cap a diagnostics list, appending a synthesized "+N more" tail entry when truncated. */
function cap<T>(items: T[], overflow: (n: number) => T): T[] {
  if (items.length <= MAX_DIAGNOSTICS) return [...items];
  return [...items.slice(0, MAX_DIAGNOSTICS), overflow(items.length - MAX_DIAGNOSTICS)];
}

/**
 * Wraps a live Playwright Page. Holds the last-capture element map so act ids
 * resolve deterministically. Accumulates console errors + failed requests over
 * the page's lifetime. This is the "eyes and hands" primitive — no LLM.
 */
export class PageSession {
  private consoleErrors: ConsoleErrorInfo[] = [];
  private failedRequests: FailedRequestInfo[] = [];
  private lastElements: ElementInfo[] = [];

  constructor(private page: Page) {
    this.attachListeners();
  }

  private attachListeners(): void {
    this.page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      // "Failed to load resource: ..." console errors just mirror failedRequests. Drop them.
      if (/^Failed to load resource/i.test(msg.text())) return;
      const loc = msg.location();
      const source = loc?.url ? `${loc.url.split('/').pop()}:${loc.lineNumber}` : undefined;
      this.consoleErrors.push({ text: msg.text(), source });
    });
    this.page.on('pageerror', (err) => {
      this.consoleErrors.push({ text: err.message });
    });
    this.page.on('requestfailed', (req) => {
      // Only surface document/xhr/fetch/script failures — media/font aborts are expected noise.
      const type = req.resourceType();
      if (type === 'image' || type === 'media' || type === 'font') return;
      this.recordFailed({ status: 0, method: req.method(), url: req.url() });
    });
    this.page.on('response', (res) => {
      if (res.status() >= 400) {
        this.recordFailed({ status: res.status(), method: res.request().method(), url: res.url() });
      }
    });
  }

  /** Dedupe failed requests by status + method + URL path (query stripped), so repeated
   *  media/API 403s with rotating query params collapse to one entry. */
  private recordFailed(req: FailedRequestInfo): void {
    const path = req.url.split('?')[0];
    const key = `${req.method}|${path}`;
    // Same path can surface as both a 4xx response and a status-0 abort — one failure, log once.
    // Prefer the entry carrying a real status code.
    const existing = this.failedRequests.find((r) => `${r.method}|${r.url}` === key);
    if (existing) {
      if (existing.status === 0 && req.status > 0) existing.status = req.status;
      return;
    }
    // Store path-only: query strings (rotating tokens/params) are noise for the caller.
    this.failedRequests.push({ ...req, url: path });
  }

  async navigateTo(url: string): Promise<void> {
    await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await this.page.waitForTimeout(1000);
  }

  currentUrl(): string {
    return this.page.url();
  }

  /** Structured element map. Rewrite of v1 extractVisibleElements — returns objects, not strings. */
  private async extractElements(maxElements: number): Promise<ElementInfo[]> {
    const raw = await this.page.evaluate((max) => {
      const out: { role: string; name: string; bbox: [number, number, number, number]; fp: string }[] = [];
      const seen = new Set<Element>();
      const selector = [
        'button', 'a', 'input', 'textarea', 'select',
        '[role="button"]', '[role="link"]', '[role="textbox"]',
        '[role="checkbox"]', '[role="tab"]', '[role="menuitem"]',
        '[data-testid]', '[data-test]', '[class*="btn"]', '[class*="button"]',
      ].join(',');
      const skipTags = new Set(['yt-interaction', 'yt-icon', 'yt-icon-button', 'yt-icon-shape', 'tp-yt-paper-ripple']);

      // A generic (non-native, no-role) element counts as interactive only if it
      // actually behaves like a control — otherwise the loose class/data-* selectors
      // pull in decorative wrappers and info panels.
      function isClickable(el: Element): boolean {
        if (el.hasAttribute('onclick')) return true;
        if ((el as HTMLElement).tabIndex >= 0) return true;
        try { if (getComputedStyle(el).cursor === 'pointer') return true; } catch { /* detached */ }
        return false;
      }

      // Returns an interactive role, or null for non-interactive elements (which are dropped).
      function roleOf(el: Element): string | null {
        const explicit = el.getAttribute('role');
        if (explicit) return explicit;
        const tag = el.tagName.toLowerCase();
        if (tag === 'a') return el.hasAttribute('href') || isClickable(el) ? 'link' : null;
        if (tag === 'button') return 'button';
        if (tag === 'input') {
          const t = (el.getAttribute('type') || 'text').toLowerCase();
          if (t === 'hidden') return null;
          if (t === 'checkbox') return 'checkbox';
          if (t === 'radio') return 'radio';
          if (t === 'submit' || t === 'button') return 'button';
          return 'textbox';
        }
        if (tag === 'textarea') return 'textbox';
        if (tag === 'select') return 'combobox';
        // div/span/etc. matched by a class or data-* heuristic: keep only if it acts clickable.
        return isClickable(el) ? 'button' : null;
      }

      const clean = (s: string | null | undefined): string =>
        (s || '').replace(/\s+/g, ' ').trim().substring(0, 80);

      // Text belonging only to `el` — excludes text inside nested controls, so a
      // menu/toolbar wrapper doesn't slurp every child's label into one blob.
      function ownText(el: Element): string {
        const NESTED = 'button,a,select,input,textarea,[role="button"],[role="link"],[role="menuitem"],[role="option"],[role="tab"]';
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        let s = '';
        let node: Node | null;
        while ((node = walker.nextNode())) {
          let p = node.parentElement;
          let skip = false;
          while (p && p !== el) {
            if (p.matches(NESTED)) { skip = true; break; }
            p = p.parentElement;
          }
          if (!skip) s += ' ' + (node.nodeValue || '');
        }
        return s;
      }

      function labelFor(el: Element): string {
        if (el.id) {
          const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
          if (l) return ownText(l);
        }
        const wrap = el.closest('label');
        return wrap ? ownText(wrap) : '';
      }

      // ARIA accessible-name precedence (simplified): labelledby → aria-label →
      // control-specific label → own visible text → title.
      function nameOf(el: Element): string {
        const tag = el.tagName.toLowerCase();

        const labelledby = el.getAttribute('aria-labelledby');
        if (labelledby) {
          const joined = labelledby.split(/\s+/)
            .map((id) => { const t = document.getElementById(id); return t ? ownText(t) : ''; })
            .join(' ');
          if (clean(joined)) return clean(joined);
        }

        const aria = el.getAttribute('aria-label');
        if (clean(aria)) return clean(aria);

        if (tag === 'input' || tag === 'textarea' || tag === 'select') {
          const lf = labelFor(el);
          if (lf) return clean(lf);
          const ph = el.getAttribute('placeholder');
          if (ph) return clean(ph);
          if (tag === 'select') {
            const sel = (el as HTMLSelectElement).selectedOptions?.[0];
            if (sel?.textContent) return clean(sel.textContent); // selected option, not every option
          } else {
            const val = (el as HTMLInputElement).value;
            if (val && (el as HTMLInputElement).type !== 'password') return clean(val);
          }
          return clean(el.getAttribute('title') || el.getAttribute('name'));
        }

        if (tag === 'img') return clean(el.getAttribute('alt'));

        const own = clean(ownText(el)); // excludes nested-control text
        if (own) return own;
        return clean(el.getAttribute('title'));
      }

      function nthPath(el: Element): string {
        const parts: string[] = [];
        let node: Element | null = el;
        let depth = 0;
        while (node && depth < 4) {
          const tag = node.tagName.toLowerCase();
          let i = 1;
          let sib = node.previousElementSibling;
          while (sib) {
            if (sib.tagName === node.tagName) i++;
            sib = sib.previousElementSibling;
          }
          parts.unshift(`${tag}:${i}`);
          node = node.parentElement;
          depth++;
        }
        return parts.join('>');
      }

      // djb2 hash so ids re-resolve across captures
      function hash(s: string): string {
        let h = 5381;
        for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
        return (h >>> 0).toString(36);
      }

      function collect(root: ParentNode): void {
        root.querySelectorAll(selector).forEach((el) => {
          if (seen.has(el)) return;
          seen.add(el);
          if (skipTags.has(el.tagName.toLowerCase())) return;
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0 && rect.x >= 0 && rect.top >= 0 && rect.top < window.innerHeight) {
            const role = roleOf(el);
            if (!role) return; // non-interactive element, drop it
            const name = nameOf(el);
            const fp = hash(`${role}|${name}|${el.tagName.toLowerCase()}|${nthPath(el)}`);
            out.push({
              role,
              name,
              bbox: [Math.round(rect.x), Math.round(rect.y), Math.round(rect.width), Math.round(rect.height)],
              fp,
            });
          }
        });
        root.querySelectorAll('*').forEach((el) => {
          const sr = (el as HTMLElement & { shadowRoot: ShadowRoot | null }).shadowRoot;
          if (sr) collect(sr);
        });
      }

      collect(document);

      // Dedupe overlapping wrappers at the same bbox; keep the best-named entry.
      const byBox = new Map<string, typeof out[number]>();
      for (const e of out) {
        const key = e.bbox.join(',');
        const prev = byBox.get(key);
        if (!prev || (e.name.length > prev.name.length)) byBox.set(key, e);
      }
      return [...byBox.values()].slice(0, max);
    }, maxElements);

    return raw.map((r, i) => ({
      id: i + 1,
      role: r.role,
      name: r.name,
      bbox: r.bbox,
      fingerprint: r.fp,
    }));
  }

  async capture(sessionId: string, opts: CaptureOptions): Promise<LookPayload> {
    const viewports = opts.viewports?.length ? opts.viewports : [{ width: 1280, height: 720 }];
    const maxElements = opts.maxElements ?? 40;

    await fs.mkdir(opts.outDir, { recursive: true });

    const screenshots: LookPayload['screenshots'] = [];
    let elements: ElementInfo[] = [];

    for (let i = 0; i < viewports.length; i++) {
      const vp = viewports[i];
      await this.page.setViewportSize(vp);
      await this.page.waitForTimeout(200);
      const vpLabel = `${vp.width}x${vp.height}`;
      const file = path.join(opts.outDir, `shot-${vp.width}.png`);
      const buffer = await this.page.screenshot({ fullPage: !!opts.fullPage });
      await sharp(buffer).png().toFile(file);
      screenshots.push({ viewport: vpLabel, path: file, fullPage: !!opts.fullPage });

      // element map captured against the first viewport
      if (i === 0) {
        elements = await this.extractElements(maxElements);
        if (opts.annotate) {
          const annotatedFile = path.join(opts.outDir, `shot-${vp.width}-annotated.png`);
          await this.annotateScreenshot(buffer, elements, annotatedFile);
          screenshots.push({ viewport: vpLabel, path: annotatedFile, fullPage: !!opts.fullPage, annotated: true });
        }
      }
    }

    this.lastElements = elements;

    return {
      session: sessionId,
      url: this.page.url(),
      title: await this.page.title(),
      screenshots,
      elements,
      consoleErrors: cap(this.consoleErrors, (n) => ({ text: `... +${n} more console errors` })),
      failedRequests: cap(
        // Drop the false-positive top-level document abort — the page actually loaded.
        this.failedRequests.filter((r) => !(r.status === 0 && this.page.url().split('?')[0] === r.url)),
        (n) => ({ status: 0, method: '', url: `... +${n} more failed requests` }),
      ),
      audit: null,
      diff: null,
      hints: [],
    };
  }

  /** Set-of-marks overlay: numbered boxes aligned to element ids. */
  private async annotateScreenshot(base: Buffer, elements: ElementInfo[], outFile: string): Promise<void> {
    const meta = await sharp(base).metadata();
    const w = meta.width ?? 1280;
    const h = meta.height ?? 720;
    // Draw every box outline first, then every id badge on top, so badges are
    // never hidden under a later box.
    const rects = elements.map((e) => {
      const [x, y, bw, bh] = e.bbox;
      return `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" fill="none" stroke="#e11d48" stroke-width="2"/>`;
    }).join('');
    const badges = elements.map((e) => {
      const [x, y] = e.bbox;
      const label = String(e.id);
      const bw = label.length * 8 + 8;
      const bh = 15;
      // Sit above the box; if that clips the top edge, tuck it just inside.
      const by = y - bh >= 0 ? y - bh : y;
      return `<rect x="${x}" y="${by}" width="${bw}" height="${bh}" rx="2" fill="#e11d48"/>` +
        `<text x="${x + 4}" y="${by + 11}" font-family="monospace" font-size="11" font-weight="bold" fill="#fff">${label}</text>`;
    }).join('');
    const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${rects}${badges}</svg>`;
    await sharp(base).composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).png().toFile(outFile);
  }

  /** Parse one clause of an --after / act text sequence. Dumb: verb + remainder. */
  static parseClause(text: string): Clause | null {
    const t = text.trim();
    // type '<text>' in <target>
    const typeMatch = t.match(/^type\s+['"](.+?)['"]\s+(?:in|into)\s+(.+)$/i);
    if (typeMatch) return { verb: 'type', text: typeMatch[1], target: typeMatch[2].trim() };
    const clickMatch = t.match(/^click\s+(.+)$/i);
    if (clickMatch) return { verb: 'click', target: clickMatch[1].trim() };
    const navMatch = t.match(/^(?:navigate|go)\s+(?:to\s+)?(.+)$/i);
    if (navMatch) return { verb: 'navigate', target: navMatch[1].trim() };
    const pressMatch = t.match(/^press\s+(.+)$/i);
    if (pressMatch) return { verb: 'press', target: pressMatch[1].trim() };
    const scrollMatch = t.match(/^scroll\s*(up|down|left|right)?/i);
    if (scrollMatch) return { verb: 'scroll', target: (scrollMatch[1] || 'down').toLowerCase() };
    const waitMatch = t.match(/^wait\s*(\d+)?/i);
    if (waitMatch) return { verb: 'wait', target: waitMatch[1] };
    return null;
  }

  /** Fuzzy-match a target string against the last element map. */
  private matchTarget(target: string): ElementInfo[] {
    const q = target.toLowerCase().replace(/^the\s+/, '').replace(/\s+(button|link|field|input|box)$/, '').trim();
    const scored = this.lastElements
      .map((e) => {
        const name = e.name.toLowerCase();
        let score = 0;
        if (name === q) score = 100;
        else if (name.includes(q)) score = 70 - Math.abs(name.length - q.length);
        else if (q.includes(name) && name.length > 2) score = 40;
        return { e, score };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score);
    if (scored.length === 0) return [];
    // treat near-tied top scores as ambiguous
    const top = scored[0].score;
    return scored.filter((s) => s.score >= top - 5).map((s) => s.e);
  }

  private async clickElement(el: ElementInfo): Promise<void> {
    const [x, y, w, h] = el.bbox;
    await this.page.mouse.click(x + w / 2, y + h / 2);
    await this.page.waitForTimeout(1000);
  }

  private async typeInElement(el: ElementInfo, text: string): Promise<void> {
    const [x, y, w, h] = el.bbox;
    await this.page.mouse.click(x + w / 2, y + h / 2);
    await this.page.waitForTimeout(200);
    await this.page.keyboard.type(text, { delay: 30 });
    await this.page.waitForTimeout(500);
  }

  /**
   * Resolve and execute one grounded action, then return a fused post-action
   * look payload. Shared by act (element + text mode) and --after.
   */
  async resolveAndAct(
    sessionId: string,
    opts: CaptureOptions,
    req: { elementId?: number; type?: string; clause?: string },
  ): Promise<ActResult> {
    const post = async (outcome: ActResult['outcome'], action: string, extra?: Partial<ActResult>): Promise<ActResult> => {
      const look = await this.capture(sessionId, opts);
      return { outcome, action, look, ...extra };
    };

    try {
      // Element-id mode: re-resolve stored fingerprint against a fresh snapshot.
      if (req.elementId != null) {
        const stored = this.lastElements.find((e) => e.id === req.elementId);
        if (!stored) return post('not_found', `element ${req.elementId}`);
        const fresh = await this.extractElements(opts.maxElements ?? 40);
        this.lastElements = fresh;
        const match = fresh.filter((e) => e.fingerprint === stored.fingerprint);
        if (match.length === 0) return post('not_found', `element ${req.elementId} ("${stored.name}")`);
        if (match.length > 1) return post('ambiguous', `element ${req.elementId} ("${stored.name}")`, { candidates: match });
        const el = match[0];
        if (req.type != null) {
          await this.typeInElement(el, req.type);
          return post('ok', `type "${req.type}" in element ${req.elementId} ("${el.name}")`);
        }
        await this.clickElement(el);
        return post('ok', `click element ${req.elementId} ("${el.name}")`);
      }

      // Text mode.
      if (req.clause != null) {
        const clause = PageSession.parseClause(req.clause);
        if (!clause) return post('error', req.clause, { error: `Could not parse action: "${req.clause}"` });

        switch (clause.verb) {
          case 'navigate':
            await this.navigateTo(clause.target!);
            return post('ok', `navigate ${clause.target}`);
          case 'press':
            await this.page.keyboard.press(clause.target!);
            await this.page.waitForTimeout(500);
            return post('ok', `press ${clause.target}`);
          case 'scroll': {
            const dir = clause.target || 'down';
            await this.page.evaluate((d) => {
              if (d === 'down') window.scrollBy(0, 500);
              else if (d === 'up') window.scrollBy(0, -500);
              else if (d === 'right') window.scrollBy(500, 0);
              else window.scrollBy(-500, 0);
            }, dir);
            await this.page.waitForTimeout(300);
            return post('ok', `scroll ${dir}`);
          }
          case 'wait':
            await this.page.waitForTimeout(clause.target ? parseInt(clause.target, 10) : 1000);
            return post('ok', `wait`);
          case 'click':
          case 'type': {
            const matches = this.matchTarget(clause.target!);
            if (matches.length === 0) return post('not_found', req.clause);
            if (matches.length > 1) return post('ambiguous', req.clause, { candidates: matches });
            const el = matches[0];
            if (clause.verb === 'type') {
              await this.typeInElement(el, clause.text ?? req.type ?? '');
              return post('ok', `type "${clause.text ?? req.type ?? ''}" in "${el.name}"`);
            }
            await this.clickElement(el);
            return post('ok', `click "${el.name}"`);
          }
        }
      }

      return post('error', 'no action', { error: 'No element id or action clause provided' });
    } catch (err) {
      return post('error', req.clause ?? `element ${req.elementId}`, { error: (err as Error).message });
    }
  }
}
