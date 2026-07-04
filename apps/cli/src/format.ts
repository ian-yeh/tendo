import type { LookPayload, ActResult, ElementInfo } from '@tendo/core';

export type OutputFormat = 'toon' | 'json';

function elementsBlock(elements: ElementInfo[], label = 'elements'): string {
  if (elements.length === 0) return `${label}[0]{id,role,name,bbox}:`;
  const rows = elements
    .map((e) => `  ${e.id},${e.role},"${e.name.replace(/"/g, "'")}",[${e.bbox.join(',')}]`)
    .join('\n');
  return `${label}[${elements.length}]{id,role,name,bbox}:\n${rows}`;
}

export function formatLook(payload: LookPayload, format: OutputFormat): string {
  if (format === 'json') return JSON.stringify(payload, null, 2);

  const lines: string[] = [];
  lines.push(`session      ${payload.session}`);
  lines.push(`url          ${payload.url}`);
  lines.push(`title        ${payload.title}`);
  if (payload.screenshots.length) {
    lines.push('screenshots:');
    for (const s of payload.screenshots) {
      lines.push(`  ${s.viewport}${s.annotated ? ' (annotated)' : ''}${s.fullPage ? ' (full-page)' : ''}: ${s.path}`);
    }
  }
  lines.push(elementsBlock(payload.elements));
  if (payload.consoleErrors.length) {
    lines.push(`consoleErrors[${payload.consoleErrors.length}]:`);
    for (const c of payload.consoleErrors) lines.push(`  ${c.text}${c.source ? ` (${c.source})` : ''}`);
  }
  if (payload.failedRequests.length) {
    lines.push(`failedRequests[${payload.failedRequests.length}]:`);
    for (const r of payload.failedRequests) lines.push(`  ${r.status || 'ERR'} ${r.method} ${r.url}`);
  }
  if (payload.audit) lines.push(`audit        ${JSON.stringify(payload.audit)}`);
  if (payload.diff) lines.push(`diff         ${JSON.stringify(payload.diff)}`);
  if (payload.hints.length) {
    lines.push('hints:');
    for (const h of payload.hints) lines.push(`  - ${h}`);
  }
  return lines.join('\n');
}

export function formatAct(result: ActResult, format: OutputFormat): string {
  if (format === 'json') return JSON.stringify(result, null, 2);

  const lines: string[] = [];
  lines.push(`outcome      ${result.outcome}`);
  lines.push(`action       ${result.action}`);
  if (result.error) lines.push(`error        ${result.error}`);
  if (result.candidates?.length) {
    lines.push(elementsBlock(result.candidates, 'candidates'));
  }
  lines.push('');
  lines.push(formatLook(result.look, 'toon'));
  return lines.join('\n');
}
