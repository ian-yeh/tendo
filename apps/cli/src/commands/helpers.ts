import type { LookPayload, ActResult } from '@tendo/core';
import type { OutputFormat } from '../format.js';
import { addHints, type LookFlags } from '../shared.js';

export function fmt(flags: LookFlags): OutputFormat {
  return flags.format === 'json' ? 'json' : 'toon';
}

export function textOnly(payload: LookPayload, flags: LookFlags): LookPayload {
  if (flags.textOnly) payload.screenshots = [];
  return payload;
}

export function splitAfter(after?: string): string[] {
  if (!after) return [];
  return after.split(',').map((s) => s.trim()).filter(Boolean);
}

export function addLookHints(result: ActResult, flags: LookFlags): ActResult {
  result.look = addHints(textOnly(result.look, flags), flags);
  return result;
}
