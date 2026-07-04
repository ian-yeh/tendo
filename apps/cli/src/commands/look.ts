import { BrowserPool, PageSession } from '@tendo/browser';
import type { ActResult, LookPayload } from '@tendo/core';
import { formatLook, formatAct } from '../format.js';
import { buildCaptureOptions, addHints, type LookFlags } from '../shared.js';
import { daemonRequest } from '../client.js';
import { fmt, textOnly, splitAfter } from './helpers.js';

/** No-session look — no daemon, browser killed after capture. */
async function oneShotLook(url: string, flags: LookFlags): Promise<void> {
  const pool = new BrowserPool({ maxBrowsers: 1, maxPagesPerBrowser: 1 });
  const opts = buildCaptureOptions(flags);
  try {
    const { page, release } = await pool.acquirePage({ headless: true, viewport: opts.viewports?.[0] ?? { width: 1280, height: 720 } });
    const session = new PageSession(page);
    await session.navigateTo(url);
    const after = splitAfter(flags.after);
    if (after.length) await session.capture('none', opts); // seed element map for text-mode --after
    for (const clause of after) {
      const r = await session.resolveAndAct('none', opts, { clause });
      if (r.outcome !== 'ok') {
        r.look.hints = [`--after aborted at "${clause}" (${r.outcome}).`, ...r.look.hints];
        console.log(formatAct(r, fmt(flags)));
        await release();
        return;
      }
    }
    const payload = addHints(textOnly(await session.capture('none', opts), flags), flags);
    console.log(formatLook(payload, fmt(flags)));
    await release();
  } finally {
    await pool.dispose();
  }
}

async function sessionLook(url: string, flags: LookFlags): Promise<void> {
  const opts = buildCaptureOptions(flags);
  const data = await daemonRequest<{ payload?: LookPayload; aborted?: boolean; result?: ActResult; failedClause?: string }>({
    cmd: 'look',
    id: flags.session,
    url,
    opts,
    after: splitAfter(flags.after),
  });
  if (data.aborted && data.result) {
    console.log(formatAct(data.result, fmt(flags)));
    return;
  }
  const payload = addHints(textOnly(data.payload!, flags), flags);
  console.log(formatLook(payload, fmt(flags)));
}

export async function runLook(url: string, flags: LookFlags): Promise<void> {
  if (flags.session) await sessionLook(url, flags);
  else await oneShotLook(url, flags);
}
