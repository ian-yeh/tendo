import { BrowserPool, PageSession } from '@tendo/browser';
import type { ActResult, LookPayload } from '@tendo/core';
import { formatLook, formatAct, type OutputFormat } from './format.js';
import { buildCaptureOptions, addHints, type LookFlags } from './shared.js';
import { daemonRequest } from './client.js';

function fmt(flags: LookFlags): OutputFormat {
  return flags.format === 'json' ? 'json' : 'toon';
}

function textOnly(payload: LookPayload, flags: LookFlags): LookPayload {
  if (flags.textOnly) payload.screenshots = [];
  return payload;
}

/** Ephemeral look — no daemon, browser killed after capture. */
async function ephemeralLook(url: string, flags: LookFlags): Promise<void> {
  const pool = new BrowserPool({ maxBrowsers: 1, maxPagesPerBrowser: 1 });
  const opts = buildCaptureOptions(flags);
  try {
    const { page, release } = await pool.acquirePage({ headless: true, viewport: opts.viewports?.[0] ?? { width: 1280, height: 720 } });
    const session = new PageSession(page);
    await session.navigateTo(url);
    const after = splitAfter(flags.after);
    if (after.length) await session.capture('ephemeral', opts); // seed element map for text-mode --after
    for (const clause of after) {
      const r = await session.resolveAndAct('ephemeral', opts, { clause });
      if (r.outcome !== 'ok') {
        r.look.hints = [`--after aborted at "${clause}" (${r.outcome}).`, ...r.look.hints];
        console.log(formatAct(r, fmt(flags)));
        await release();
        return;
      }
    }
    const payload = addHints(textOnly(await session.capture('ephemeral', opts), flags), flags);
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
  else await ephemeralLook(url, flags);
}

function splitAfter(after?: string): string[] {
  if (!after) return [];
  return after.split(',').map((s) => s.trim()).filter(Boolean);
}

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
    console.error('act needs a <url> (ephemeral) or --session <id>.');
    process.exitCode = 1;
    return;
  }
  const act = {
    elementId: flags.element ? parseInt(flags.element, 10) : undefined,
    type: flags.type,
    clause: action,
  };

  // ephemeral act: fresh load of <url>, one action, kill.
  const pool = new BrowserPool({ maxBrowsers: 1, maxPagesPerBrowser: 1 });
  try {
    const { page, release } = await pool.acquirePage({ headless: true, viewport: opts.viewports?.[0] ?? { width: 1280, height: 720 } });
    const session = new PageSession(page);
    await session.navigateTo(target);
    await session.capture('ephemeral', opts); // seed element map for text/element mode
    const result = await session.resolveAndAct('ephemeral', opts, act);
    console.log(formatAct(addLookHints(result, flags), fmt(flags)));
    await release();
  } finally {
    await pool.dispose();
  }
}

function addLookHints(result: ActResult, flags: LookFlags): ActResult {
  result.look = addHints(textOnly(result.look, flags), flags);
  return result;
}

export async function runSessions(): Promise<void> {
  try {
    const data = await daemonRequest<{ sessions: { id: string; url: string; ttlRemainingMs: number }[] }>(
      { cmd: 'list' },
      false,
    );
    if (!data.sessions.length) {
      console.log('No live sessions.');
      return;
    }
    for (const s of data.sessions) {
      console.log(`${s.id}\t${Math.round(s.ttlRemainingMs / 1000)}s left\t${s.url}`);
    }
  } catch {
    console.log('No live sessions (daemon not running).');
  }
}

export async function runKill(id: string | undefined, opts: { all?: boolean }): Promise<void> {
  try {
    await daemonRequest({ cmd: 'kill', id, all: opts.all }, false);
    console.log(opts.all ? 'Killed all sessions.' : `Killed ${id}.`);
  } catch {
    console.log('Daemon not running.');
  }
}
