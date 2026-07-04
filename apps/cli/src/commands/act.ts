import { BrowserPool, PageSession } from '@tendo/browser';
import type { ActResult } from '@tendo/core';
import { formatAct } from '../format.js';
import { buildCaptureOptions, type LookFlags } from '../shared.js';
import { daemonRequest } from '../client.js';
import { fmt, addLookHints } from './helpers.js';

interface ActFlags extends LookFlags {
  element?: string;
  type?: string;
}

export async function runAct(target: string | undefined, action: string | undefined, flags: ActFlags): Promise<void> {
  const opts = buildCaptureOptions(flags);

  if (flags.session) {
    // In session mode the first positional is the action clause (there is no URL).
    const clause = action ?? target;
    const data = await daemonRequest<{ result: ActResult }>({
      cmd: 'act',
      id: flags.session,
      opts,
      act: { elementId: flags.element ? parseInt(flags.element, 10) : undefined, type: flags.type, clause },
    });
    console.log(formatAct(addLookHints(data.result, flags), fmt(flags)));
    return;
  }

  if (!target) {
    console.error('act needs a <url> (one-shot) or --session <id>.');
    process.exitCode = 1;
    return;
  }
  const act = {
    elementId: flags.element ? parseInt(flags.element, 10) : undefined,
    type: flags.type,
    clause: action,
  };

  // one-shot act: fresh load of <url>, one action, kill.
  const pool = new BrowserPool({ maxBrowsers: 1, maxPagesPerBrowser: 1 });
  try {
    const { page, release } = await pool.acquirePage({ headless: true, viewport: opts.viewports?.[0] ?? { width: 1280, height: 720 } });
    const session = new PageSession(page);
    await session.navigateTo(target);
    await session.capture('none', opts); // seed element map for text/element mode
    const result = await session.resolveAndAct('none', opts, act);
    console.log(formatAct(addLookHints(result, flags), fmt(flags)));
    await release();
  } finally {
    await pool.dispose();
  }
}
