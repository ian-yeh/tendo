import net from 'node:net';
import fs from 'node:fs';
import { BrowserPool, PageSession } from '@tendo/browser';
import type { CaptureOptions } from '@tendo/core';
import { SOCKET_PATH } from './shared.js';

interface Session {
  session: PageSession;
  release: () => Promise<void>;
  lastUsed: number;
  ttlMs: number;
}

const DEFAULT_TTL_MS = 10 * 60 * 1000;
const GRACE_MS = 2 * 60 * 1000;

const pool = new BrowserPool({ maxBrowsers: 10, maxPagesPerBrowser: 1 });
const sessions = new Map<string, Session>();
let lastActivity = Date.now();

interface Req {
  cmd: 'ping' | 'look' | 'act' | 'list' | 'kill';
  id?: string;
  url?: string;
  opts?: CaptureOptions;
  after?: string[];
  act?: { elementId?: number; type?: string; clause?: string };
  all?: boolean;
}

async function getOrCreate(id: string, url?: string): Promise<Session> {
  let s = sessions.get(id);
  if (!s) {
    const { page, release } = await pool.acquirePage({ headless: true, viewport: { width: 1280, height: 720 } });
    s = { session: new PageSession(page), release, lastUsed: Date.now(), ttlMs: DEFAULT_TTL_MS };
    sessions.set(id, s);
    if (url) await s.session.navigateTo(url);
  } else if (url && s.session.currentUrl() !== url) {
    await s.session.navigateTo(url);
  }
  s.lastUsed = Date.now();
  return s;
}

async function handle(req: Req): Promise<unknown> {
  lastActivity = Date.now();
  switch (req.cmd) {
    case 'ping':
      return { pong: true };

    case 'list':
      return {
        sessions: [...sessions.entries()].map(([id, s]) => ({
          id,
          url: s.session.currentUrl(),
          ttlRemainingMs: Math.max(0, s.ttlMs - (Date.now() - s.lastUsed)),
        })),
      };

    case 'kill': {
      if (req.all) {
        for (const [, s] of sessions) await s.release().catch(() => {});
        sessions.clear();
        return { killed: 'all' };
      }
      const s = sessions.get(req.id!);
      if (s) {
        await s.release().catch(() => {});
        sessions.delete(req.id!);
      }
      return { killed: req.id };
    }

    case 'look': {
      const s = await getOrCreate(req.id!, req.url);
      const after = req.after ?? [];
      if (after.length) await s.session.capture(req.id!, req.opts!); // seed element map for text-mode --after
      for (const clause of after) {
        const r = await s.session.resolveAndAct(req.id!, req.opts!, { clause });
        if (r.outcome !== 'ok') {
          const look = r.look;
          look.hints = [`--after aborted at "${clause}" (${r.outcome}). Fix the sequence and retry.`, ...look.hints];
          return { aborted: true, failedClause: clause, result: r };
        }
      }
      return { payload: await s.session.capture(req.id!, req.opts!) };
    }

    case 'act': {
      const s = await getOrCreate(req.id!, req.url);
      return { result: await s.session.resolveAndAct(req.id!, req.opts!, req.act!) };
    }
  }
}

function reap(): void {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (now - s.lastUsed > s.ttlMs) {
      s.release().catch(() => {});
      sessions.delete(id);
    }
  }
  if (sessions.size === 0 && now - lastActivity > GRACE_MS) {
    shutdown();
  }
}

async function shutdown(): Promise<void> {
  for (const [, s] of sessions) await s.release().catch(() => {});
  await pool.dispose().catch(() => {});
  try { fs.unlinkSync(SOCKET_PATH); } catch {}
  process.exit(0);
}

function start(): void {
  try { fs.unlinkSync(SOCKET_PATH); } catch {}

  const server = net.createServer((socket) => {
    let buf = '';
    socket.on('data', async (chunk) => {
      buf += chunk.toString();
      let idx: number;
      while ((idx = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, idx);
        buf = buf.slice(idx + 1);
        if (!line.trim()) continue;
        try {
          const req = JSON.parse(line) as Req;
          const data = await handle(req);
          socket.write(JSON.stringify({ ok: true, data }) + '\n');
        } catch (err) {
          socket.write(JSON.stringify({ ok: false, error: (err as Error).message }) + '\n');
        }
      }
    });
    socket.on('error', () => {});
  });

  server.listen(SOCKET_PATH, () => {
    setInterval(reap, 60_000).unref();
  });

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start();
