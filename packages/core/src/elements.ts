// Tendo types — "eyes and hands" contract. No LLM concepts here.

/** [x, y, width, height] in CSS pixels at the capture viewport. */
export type Bbox = [number, number, number, number];

export interface ElementInfo {
  /** 1-based ordinal within a single capture. Matches --annotate overlay numbers. */
  id: number;
  role: string;
  name: string;
  bbox: Bbox;
  /** hash(role + name + tag + nth-of-type path); used to re-resolve across captures. */
  fingerprint: string;
}

export interface ScreenshotInfo {
  viewport: string; // e.g. "1440x900"
  path: string;
  fullPage: boolean;
  annotated?: boolean;
}

export interface ConsoleErrorInfo {
  text: string;
  source?: string;
}

export interface FailedRequestInfo {
  status: number;
  method: string;
  url: string;
}

export interface LookPayload {
  session: string; // session id, or "ephemeral"
  url: string;
  title: string;
  screenshots: ScreenshotInfo[];
  elements: ElementInfo[];
  consoleErrors: ConsoleErrorInfo[];
  failedRequests: FailedRequestInfo[];
  audit: unknown | null;
  diff: unknown | null;
  hints: string[];
}

export type ActOutcome = 'ok' | 'not_found' | 'ambiguous' | 'error';

export interface ActResult {
  outcome: ActOutcome;
  action: string; // human-readable description of what was attempted
  candidates?: ElementInfo[]; // populated on "ambiguous"
  error?: string; // populated on "error"
  look: LookPayload; // fused post-action observation
}

export interface CaptureOptions {
  outDir: string;
  viewports?: { width: number; height: number }[];
  fullPage?: boolean;
  maxElements?: number;
  annotate?: boolean;
}

/** One grounded action, produced by comma-splitting --after or an act text clause. */
export interface Clause {
  verb: 'click' | 'type' | 'scroll' | 'navigate' | 'wait' | 'press';
  target?: string; // fuzzy role+name target, or url/key/direction depending on verb
  text?: string; // for type
}
