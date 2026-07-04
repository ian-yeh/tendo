# Tendo v2 — Scoping Document

## Thesis

Tendo v1 is an autonomous QA agent: it owns a VLM loop, planning, loop detection, and retries. Tendo v2 inverts this. The caller is already a coding agent (Claude Code, Codex) that is multimodal and pays for its own tokens. Tendo v2 is **eyes and hands** for that agent: it captures page state and executes grounded actions deterministically, and does no reasoning of its own.

- **No LLM provider inside Tendo.** No API key, no `tendo config`. `npx -y tendo look <url>` works with zero setup.
- **Design target:** minimum caller tokens per unit of visual understanding.
- **Two commands only:** `look` and `act`.

The caller does all reasoning and vision. Tendo returns structured facts (element maps, a11y roles, screenshot paths, console/network errors) and paths to images the caller can read when it decides it needs pixels.

---

## What survives from v1

Verdict on the v1 pivot's core question: **quarantine the agent loop, don't delete it, but do not ship it.** The reasoning: `AgentRunner` + `VisionClient` + `PromptEngine` + providers are the *entire* v1 value prop and are useless to v2's contract (no LLM in Tendo). Keeping them behind a `--legacy` flag means keeping the `@tendo/vision`, `@tendo/prompt-engine`, and provider deps + API-key config plumbing alive, which directly contradicts "zero setup." So: **cut them from the shipped dependency graph**, move to `.archive/agent-v1/` alongside the existing archived code. They stay recoverable in git and on disk for reference (the loop-detection and prompt heuristics inform the v2.1 self-heal fallback) but are not a runtime code path. No `--legacy` flag.

| Module | Verdict | Notes |
|---|---|---|
| `packages/browser/BrowserPool` | **Keep, extend** | Chromium lifecycle + idle reaping already exist. Extend for persistent sessions (user-data-dir, named session map, TTL reaping already stubbed at `cleanupIdleBrowsers`). |
| `packages/browser/PageInteractor` — screenshot pipeline | **Keep** | `sharp` resize + JPEG is exactly the capture path v2 needs. Add full-page, region crop, multi-viewport. Stop returning base64 inline; write to disk and return paths. |
| `PageInteractor.extractVisibleElements` | **Rewrite** | v1 returns a formatted *string* (`[0] button#id "label" @ center=(x,y)`) capped at 40, coordinate-centric. v2 needs a structured element map keyed by stable id with role, name, bbox, and a handle back to the DOM node (see Element map staleness). Keep the shadow-DOM piercing and the interactive-selector list — they're good. Drop the string formatting. |
| `PageInteractor.executeAction` | **Keep, extend** | The click/type/scroll/navigate/key primitives are the "hands." Add element-id-resolved click/type. Keep coordinate validation (the `(0,0)` guard). Drop `evaluate` from the default surface (arbitrary script exec is a caller-reasoning affordance v2 doesn't need; leave the primitive, don't expose it). |
| `blockTrackers` | **Keep** | Cheap, reduces noise in console/network capture. |
| `webdriver` stealth init script | **Keep** | Harmless, helps on bot-walled sites. |
| `packages/core` types (`Action`, `PageContext`) | **Rewrite** | `Action` is coordinate-only and carries agent-loop fields (`done`/`fail`/`reason`). v2 `Action` is `{click|type|scroll|navigate|key}` with element-id *or* coordinate targeting. `PageContext` becomes the `look` payload schema. `VisionDecision`, `AgentState`, `AgentConfig` → archive. |
| `packages/agent/AgentRunner` | **Archive** | The whole event-driven VLM loop. Loop-detection (fuzzy fingerprint + pixel sampling) and `screenshotsMatch` are worth porting into v2's `--diff` (pixel diff) and v2.1 self-heal, but not as a loop. |
| `packages/vision/*` (VisionClient, PageAnalyzer, providers) | **Archive** | LLM-facing. Contradicts "no LLM in Tendo." |
| `packages/prompt-engine/*` | **Archive** | Builds VLM prompts. Gone. |
| `apps/cli` `test` / `report` / `config` commands | **Kill** | Replaced by `look` / `act`. `config` is explicitly deleted (no keys). |
| `apps/cli/ReportGenerator` (HTML report) | **Keep, demote** | Not a command anymore, but the HTML step/screenshot renderer is reusable as an *optional* human-facing artifact from `look --format html` or a `--report` flag. Low priority; keep the code, don't wire it into M1-M2. |
| `apps/web` landing page | **Keep, untouched** | Marketing, orthogonal to CLI. |
| `dotenv`, provider SDK deps | **Kill** | Removed from `apps/cli`. Part of achieving zero-setup. |

Net: `@tendo/browser` and `@tendo/core` survive and grow. `@tendo/agent`, `@tendo/vision`, `@tendo/prompt-engine` are archived. A new thin `@tendo/session` (daemon + session registry) is added.

---

## CLI Spec

### `tendo look <url>`

Capture page state → artifacts on disk + machine-readable summary on stdout. Never inlines image bytes.

```
tendo look <url> [flags]

  --session <id>        Reattach to a live browser session. Default: ephemeral
                        (browser launched, captured, killed).
  --after "<seq>"       Grounded setup actions before capture. Comma-separated
                        clauses, one grounded action each. Shares act's engine.
                        e.g. --after "type 'ada@x.com' in email, type 'pw' in
                        password, click sign in, click add to cart"
  --region <selector>   Crop screenshot to the element's bbox.
  --annotate            Numbered set-of-marks overlay on interactive elements.
  --text-only           A11y tree only, no screenshot (cheapest tier).
  --viewport <list>     One or more, comma-separated. e.g. 1440x900,390x844
  --full-page           Capture beyond the fold.
  --out <dir>           Artifact output dir. Default: ./.tendo/<timestamp>/
  --format toon|json    stdout payload format. Default: toon.
  --diff <prev-out>     Pixel + layout diff vs a previous capture dir.
  --audit               axe-core contrast/tap-target violations + CLS/LCP.
```

**stdout payload** (never image bytes; only paths):

```
session      s1                 (or "ephemeral")
url          https://shop.example.com/cart
title        Your Cart
screenshots  1440x900: .tendo/20260703-1[42](.../shot-1440.png)
             390x844:  .tendo/20260703-142/shot-390.png
elements[6]{id,role,name,bbox}:
  1,button,"Checkout",[1180,24,120,44]
  2,link,"Continue shopping",[24,24,180,44]
  3,textbox,"Promo code",[24,120,300,40]
  4,button,"Apply",[336,120,80,40]
  5,button,"Remove — Widget A",[900,220,90,32]
  6,button,"Remove — Widget B",[900,300,90,32]
consoleErrors[1]:
  TypeError: undefined is not a function (cart.js:44)
failedRequests[1]:
  503 GET /api/promo/validate
hints:
  - No visual assertion needed? Re-run with --text-only next time (cheaper).
  - To click Checkout deterministically: tendo act --session s1 --element 1
```

JSON form of the same (schema):

```json
{
  "session": "s1",
  "url": "https://shop.example.com/cart",
  "title": "Your Cart",
  "screenshots": [
    { "viewport": "1440x900", "path": ".tendo/20260703-142/shot-1440.png", "fullPage": false },
    { "viewport": "390x844",  "path": ".tendo/20260703-142/shot-390.png",  "fullPage": false }
  ],
  "elements": [
    { "id": 1, "role": "button",  "name": "Checkout",          "bbox": [1180, 24, 120, 44] },
    { "id": 3, "role": "textbox", "name": "Promo code",        "bbox": [24, 120, 300, 40] }
  ],
  "consoleErrors": [
    { "text": "TypeError: undefined is not a function", "source": "cart.js:44" }
  ],
  "failedRequests": [
    { "status": 503, "method": "GET", "url": "/api/promo/validate" }
  ],
  "audit": null,
  "diff": null,
  "hints": ["..."]
}
```

`bbox` is `[x, y, width, height]` in CSS pixels at the capture viewport. `--annotate` adds an `annotated` screenshot path whose numbered boxes correspond to `elements[].id`. `--audit` populates `audit: { contrast: [...], tapTargets: [...], cls: 0.04, lcp: 1830 }`. `--diff` populates `diff: { changedPixelsPct: 3.2, movedElements: [...], addedElements: [...], removedElements: [...] }`.

### `tendo act <url|--session <id>> <action>`

Execute one action, return the post-action `look` payload inline (fused action + observation — never a bare "Done").

```
tendo act --session <id> [target] [flags]
tendo act <url> [target] [flags]        (ephemeral: act on a fresh load)

  --element <n>         Click/type by annotated element id from the last capture.
                        Deterministic. Resolves against the last-capture element
                        map. Stale id → outcome not_found + a fresh look payload.
  --type "<text>"       Text to type. Combined with --element (or text target).
  <action> (text mode)  "click the checkout button" → a11y role+name fuzzy match,
                        no VLM. Ambiguous → outcome ambiguous + ranked candidates.
  --format toon|json
```

**Outcomes:** `ok | not_found | ambiguous | error`. Every outcome returns a full `look` payload of the resulting state (fused), plus:

```
outcome      ok
action       click element 1 ("Checkout")
url          https://shop.example.com/checkout      <- changed
title        Checkout
...full look payload of the new page...
hints:
  - URL changed, capture reflects the new page.
```

Ambiguous example:

```
outcome      ambiguous
action       click "remove"
candidates[2]{id,role,name}:
  5,button,"Remove — Widget A"
  6,button,"Remove — Widget B"
hints:
  - Pick one: tendo act --session s1 --element 5
```

`not_found` (stale id) returns `outcome not_found` **plus a fresh look payload** so the caller can re-target in one round trip instead of two.

---

## Architecture decisions

### 1. Session persistence — **Recommendation: daemon holding browser instances over a unix socket.**

Options compared:

- **Daemon + unix socket.** A `tendo` background process owns `BrowserPool`, holds live Playwright `Browser`/`Context`/`Page` handles keyed by session id. CLI invocations are thin clients that connect to `~/.tendo/daemon.sock`, send a command, stream back the payload. Auto-spawns on first `--session` use.
- **Persisted CDP endpoint + user-data-dir reattach.** No daemon; each CLI run relaunches Chromium against a persisted `--user-data-dir` and stored CDP ws endpoint.

**Choose the daemon.** Rationale:

- Playwright's high-level API (`page.accessibility`, element handles, route interception for console/network capture) requires a live `Browser` object, not a bare CDP reconnect. Reattaching via `chromium.connectOverCDP` loses the `Page`/`ElementHandle` objects and the a11y snapshot cache — every `act` would re-navigate and re-snapshot, defeating "agent turns minutes apart."
- The element map (see below) is held in daemon memory keyed to a live `Page`. Reattach-per-call cannot preserve node handles across calls.
- v1 already has `BrowserPool` with an idle-reap interval — the daemon is a small wrapper, not a new subsystem.

CDP reattach's only edge (surviving a machine reboot) is not worth it: agent sessions are minutes, not days.

**Daemon design:**
- Socket: `~/.tendo/daemon.sock` (`\\.\pipe\tendo` on Windows). Length-prefixed JSON frames.
- Lifecycle: first `look --session <id>` / `act --session <id>` auto-spawns the daemon (detached) if the socket is dead. Ephemeral `look` (no `--session`) never touches the daemon — spawns Chromium inline, captures, kills.
- Session registry: `Map<sessionId, { context, page, elementMap, lastUsed, userDataDir }>`.
- **TTL / idle reaping:** per-session idle timer, default **10 min** (`--ttl` override). A sweep every 60s (reuse `cleanupIdleBrowsers` cadence) closes contexts past TTL. When the last session closes, the daemon self-exits after a grace period (e.g. 2 min) so nothing lingers.
- `tendo sessions` (minor 3rd command, non-negotiable for debuggability) lists live sessions + TTL remaining; `tendo kill <id>` / `tendo kill --all`. This is plumbing, not a reasoning surface — allowed alongside the "two commands" rule.

### 2. Element map staleness — **Recommendation: re-snapshot on every capture; ids are per-capture ordinals bound to a resolved locator + fingerprint.**

The naive options — persistent a11y node ids or CDP backend DOM node ids — are brittle: backend node ids are invalidated on navigation and many mutations, and a11y ids aren't stable across re-renders. SPA mutations would silently point an id at the wrong node.

**Design:**
- Every `look`/`act` capture produces a **fresh** element map. `id` is a simple 1-based ordinal within that capture (stable enough for one caller round trip; matches the `--annotate` overlay numbers).
- Each element stores, in daemon memory alongside the live `Page`: `{ id, role, name, bbox, fingerprint }` where `fingerprint = hash(role + name + tag + nth-of-type path)`.
- `act --element <n>` resolves as: look up id in the **last** capture for that session → re-resolve a Playwright locator from role+name (`getByRole(role, { name })`), scoped/disambiguated by the stored fingerprint → if exactly one match and its current bbox is within tolerance of the stored bbox, act. If the node moved a lot or vanished → **`not_found` + fresh capture**. If role+name now matches multiple → **`ambiguous` + candidates**.
- This means ids never dangle onto the wrong node: staleness degrades to `not_found`/`ambiguous`, never a mis-click. The cost (re-snapshot per act) is cheap relative to a caller LLM turn and is what keeps determinism honest.

### 3. `--after` grounding — **Shares the exact `act` text-mode engine. Grammar: comma-split, one grounded action per clause.**

Feasible and cheap. `--after "type 'ada@x.com' in email, click sign in, click add to cart"`:
- Split on commas → clauses.
- Each clause parsed by a **dumb** rule-based parser (no NLP, no VLM): leading verb (`type`/`click`/`scroll`/`navigate`/`wait`/`press`) + remainder. `type '<text>' in <target>` and `click <target>` are the two hot paths. `<target>` goes through the same a11y role+name fuzzy matcher `act` text mode uses.
- Each clause executes as one grounded `act`, sequentially, against the session, before the final capture. Any clause that returns `ambiguous`/`not_found` aborts `--after` and surfaces the failing clause + candidates in the `look` payload (so the caller fixes the sequence and retries).
- Confirmed: one engine (`resolveAndAct(clause)`), used by `act` text mode, `--after`, and later replay. No divergence.

Explicitly out of scope: conditionals, loops, variables, "login as x" role lookups. Keep it dumb — comma-split, verb + target. If a caller needs branching, it calls `act` per step and reasons between calls (that's the whole point of v2).

### 4. Output format — **Default TOON, `--format json` opt-in.**

TOON (Token-Oriented Object Notation) wins for the tabular element map, which dominates payload size. Representative payload: the 6-element cart capture above.

| Format | Est. tokens (element map + envelope) | Notes |
|---|---|---|
| JSON (pretty) | ~430 | Repeated keys per element (`"id":`, `"role":`, `"name":`, `"bbox":`) × 6 rows. |
| JSON (minified) | ~300 | Still repeats keys. |
| TOON (`elements[6]{id,role,name,bbox}:` + rows) | ~180 | Keys declared once in the header; rows are pure values. ~40% under minified JSON, ~58% under pretty. |

The savings scale with element count — a 40-element page (v1's cap) widens the gap. TOON's header-once tabular form is exactly the shape of an element map, so it's the default. JSON stays available for callers that pipe into `jq`. (Numbers are estimates from token-per-char heuristics on the sample; M4 benchmark will replace them with `tiktoken`/actual tokenizer counts.)

### 5. Compile / replay (v2.1 — reserve seams only)

Every `act` and every `--after` clause already flows through `resolveAndAct(clause)` and produces a structured record: `{ clause, resolvedLocator (role+name+fingerprint), coordinatesUsed, outcome, resultingUrl }`. Reserve:
- A per-session **action journal** (append-only list of those records) that `look`/`act` already have the data to populate. Not surfaced in M1-M3; just recorded.
- `tendo compile <session>` (v2.1) → emits the journal as a deterministic replay script (ordered grounded actions, vision-free, resolved by role+name+fingerprint).
- `tendo replay <script>` (v2.1) → executes vision-free; on a clause that returns `not_found`/`ambiguous`, **self-heal fallback**: fall back to a fresh capture and hand the caller the ambiguity (or, later, re-resolve by loosened fingerprint). The v1 loop-detection/pixel-diff heuristics feed this self-heal.

Do not design the script format now. The one seam that must exist from M2: `resolveAndAct` returns a serializable resolution record, and the daemon keeps the journal. Everything else is v2.1.

---

## Distribution (scope, not build)

- **`SKILL.md` in Agent Skills format**, installable via `npx skills add`, invoked via `npx -y tendo`. Model conventions on `kunchenguid/gh-axi` and `chrome-devtools-axi`: contextual next-step `hints:` in every response (already in the payload schema above), action+observation fusion (the `act` contract), TOON output by default.
- **Escalation ladder documented in SKILL.md** so agents default to the cheapest tier and only spend pixels when needed:
  1. `--text-only` (a11y tree, no image) — most tasks.
  2. `--region <selector>` (crop to one component) — targeted visual check.
  3. full `look` (screenshot + element map) — need the whole page.
  4. `--annotate` (set-of-marks) — need to point the caller's vision at specific numbered targets.
  The SKILL.md leads with this ladder and frames every `hints:` line to nudge down a rung when possible.
- **Benchmark plan:** run `kunchenguid/axi bench-browser` (16 tasks) against Tendo v2. Report per-task pass + caller-token cost. The launch comparison is the subset where DOM/selector-driven tools structurally fail: **canvas/WebGL targets, visual assertions (spacing, overlap, color, rendered-not-DOM state), and cross-viewport layout**. Those are Tendo's headline wins; publish them head-to-head vs `chrome-devtools-axi`.

---

## Competitive framing

`chrome-devtools-axi` (DOM/selector-driven, wraps `chrome-devtools-mcp`, strong benchmark numbers) is the incumbent.

- **Where Tendo loses:** plain DOM tasks on cost. For "click the button with id=submit" on a clean semantic page, a selector tool is cheaper (no screenshot, no set-of-marks) and just as reliable. Tendo's `--text-only` narrows this but doesn't win it. Concede it explicitly.
- **Where Tendo wins:**
  - **Vision-native capture** — annotated screenshots (set-of-marks), so the caller's own vision grounds on numbered targets; canvas/WebGL/`<video>` content a DOM tool can't see.
  - **Visual diff** (`--diff`) and **UX audit** (`--audit`: contrast, tap-targets, CLS/LCP) — assertions about *rendered* state, not DOM state.
  - **`--after` state setup** — one call gets you a logged-in, item-in-cart page ready to inspect, sharing the grounded-action engine.
  - **Compile/replay** (v2.1) — turn an explored flow into a deterministic, vision-free regression script with self-heal.

Positioning: Tendo is not a cheaper selector tool; it's the tool you reach for when the assertion is *visual* or the DOM lies about what's on screen.

---

## Milestones

**M1 — `look`, ephemeral.**
- Kill `test`/`report`/`config`; archive `agent`/`vision`/`prompt-engine`; strip `dotenv` + provider deps.
- `look <url>` ephemeral: launch → navigate → capture → kill.
- Structured element map (role, name, bbox, id) — rewrite of `extractVisibleElements`.
- Screenshot-to-disk pipeline (paths, never inline). `--full-page`, `--out`, `--viewport` (single).
- Console errors + failed requests capture.
- TOON + `--format json` output, `hints:`.
- Deliverable: `npx -y tendo look <url>` with zero setup.

**M2 — sessions + `act`.**
- Daemon over unix socket; session registry; `--session`; TTL/idle reaping; `tendo sessions`/`kill`.
- `resolveAndAct(clause)` engine: element-id resolution (fingerprint + bbox tolerance) and a11y role+name text mode.
- `act --element`/`--type` and text mode. Outcomes `ok|not_found|ambiguous|error`, fused post-action `look` payload, ranked candidates.
- `--after` (comma-split, shares the engine).
- Reserve the replay seam: `resolveAndAct` returns a resolution record; daemon keeps the per-session journal.

**M3 — `annotate` / `audit` / `diff`.**
- `--annotate` set-of-marks overlay aligned to element ids.
- `--region` crop, multi-viewport in one call, `--text-only`.
- `--audit` (axe-core contrast/tap-targets + CLS/LCP from perf trace).
- `--diff` (pixel diff via ported `screenshotsMatch`/pixelmatch + layout/element-set diff).

**M4 — skill + bench.**
- `SKILL.md` (Agent Skills format), escalation ladder, `hints:` conventions, `npx skills add`.
- Run `axi bench-browser` (16 tasks); real tokenizer token counts replace the estimates in §4.
- Publish head-to-head vs `chrome-devtools-axi` on the visual/canvas subset.

---

## Open questions

1. **Daemon auth.** Unix socket perms (0600, user-only) are probably enough. Any multi-user or container story? Assume single-user local for now.
2. **`--after` failure granularity.** On a mid-sequence failure, do we leave the browser in the partial state (session persists, caller resumes) or roll back? Recommend: leave it, surface the failing clause — caller decides. Confirm.
3. **Element map cap.** v1 caps at 40 for LLM budget. v2's caller pays the tokens; do we keep a cap, raise it, or make it a `--max-elements` flag? Recommend `--max-elements` default 40, since TOON makes larger maps affordable.
4. **Text-mode matcher library.** Roll our own role+name fuzzy match over `page.accessibility.snapshot()`, or lean on Playwright's `getByRole`/`getByText` resolver directly? Leaning on Playwright is less code and shares its stability guarantees — recommend that, validate it exposes ranked candidates for `ambiguous`.
5. **`bbox` coordinate space under `--full-page`.** Element bboxes for off-screen (below-fold) elements — document that bbox is document-space for full-page captures vs viewport-space otherwise, or normalize. Needs a decision before M3 annotate.
6. **Windows named-pipe parity** for the daemon — defer, but flag it so the socket abstraction isn't unixism-locked.
7. **axe-core weight.** Bundling axe-core (~500KB) into a `npx -y` tool inflates cold-start. Lazy-load only when `--audit` is passed, or inject from CDN at audit time. Recommend lazy local require.
