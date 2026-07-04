import type { CaptureOptions, LookPayload } from '@tendo/core';
import path from 'node:path';
import os from 'node:os';

export interface LookFlags {
  session?: string;
  after?: string;
  region?: string;
  annotate?: boolean;
  textOnly?: boolean;
  viewport?: string;
  fullPage?: boolean;
  out?: string;
  format?: string;
  diff?: string;
  audit?: boolean;
  maxElements?: string;
}

export function parseViewports(spec?: string): { width: number; height: number }[] | undefined {
  if (!spec) return undefined;
  return spec.split(',').map((part) => {
    const [w, h] = part.trim().toLowerCase().split('x').map((n) => parseInt(n, 10));
    if (!w || !h) throw new Error(`Invalid viewport "${part}". Use WxH, e.g. 1440x900.`);
    return { width: w, height: h };
  });
}

export function defaultOutDir(base?: string): string {
  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  return base ?? path.join(process.cwd(), '.tendo', stamp);
}

export function buildCaptureOptions(flags: LookFlags): CaptureOptions {
  return {
    outDir: defaultOutDir(flags.out),
    viewports: parseViewports(flags.viewport),
    fullPage: !!flags.fullPage,
    annotate: !!flags.annotate,
    maxElements: flags.maxElements ? parseInt(flags.maxElements, 10) : 40,
  };
}

/** Cheap heuristic next-step hints so callers default down the escalation ladder. */
export function addHints(payload: LookPayload, flags: LookFlags): LookPayload {
  const hints: string[] = [];
  if (!flags.textOnly && payload.elements.length > 0) {
    hints.push('If no visual check is needed, re-run with --text-only next time (no screenshot, cheaper).');
  }
  if (payload.elements.length > 0 && payload.session !== 'ephemeral') {
    const first = payload.elements[0];
    hints.push(`Deterministic action: tendo act --session ${payload.session} --element ${first.id}  # "${first.name}"`);
  }
  if (payload.session === 'ephemeral') {
    hints.push('Start a reusable session with --session <id> to keep the browser alive for act.');
  }
  if (payload.consoleErrors.length) hints.push('Console errors present — the page may be broken.');
  payload.hints = hints;
  return payload;
}

export const SOCKET_PATH =
  process.platform === 'win32' ? '\\\\.\\pipe\\tendo' : path.join(os.tmpdir(), 'tendo-daemon.sock');
