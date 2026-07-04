## What This Is

Tendo is **eyes and hands for coding agents**. It is not an autonomous agent - it does no reasoning and ships no LLM. A calling agent (Claude Code, Codex, etc.) does the vision and planning; Tendo captures page state and executes grounded browser actions deterministically. `npx -y tendo` works with zero setup: no API key, no config.

Design target: **minimum caller tokens per unit of visual understanding.**

## Commands

```bash
# Build all packages and apps
npm run build --workspaces

# Build a specific workspace (order: core → browser → cli)
npm run build --workspace=packages/core
npm run build --workspace=apps/cli

# Run the built CLI
node apps/cli/dist/index.js <command>        # or `tendo <command>` if linked

tendo look <url>                             # capture page state → artifacts + summary
tendo act <url|--session id> <action>        # execute one grounded action, return fused state
tendo sessions                               # list live browser sessions + TTL
tendo kill <id> | --all                      # close sessions
```

No test runner is configured yet.

## The Two Commands

**`look`** — capture state. Launches (or reattaches to) a page, writes screenshots to disk (never inlined), and prints a machine-readable summary: element map (`id, role, name, bbox`), console errors, failed requests, screenshot paths, next-step hints. Key flags: `--session <id>` (persistent session vs default one-shot), `--after "<seq>"` (grounded setup actions), `--annotate` (numbered set-of-marks overlay), `--text-only`, `--viewport WxH,...`, `--full-page`, `--format toon|json`, `--out <dir>`, `--max-elements <n>`.

**`act`** — execute one action, return the post-action `look` payload inline (fused action+observation, never a bare "Done"). Targeting is either `--element <n>` (deterministic, re-resolves the last capture's element by fingerprint) or a text clause (`"click the checkout button"` → fuzzy role+name match). Outcomes: `ok | not_found | ambiguous | error`. Ambiguous returns ranked candidates for the caller to disambiguate by id.

## Monorepo Structure

npm workspaces: `apps/*` and `packages/*`. All ESM TypeScript targeting NodeNext.

**Dependency chain:** `apps/cli` → `@tendo/browser` → `@tendo/core`.

- `packages/core` (`elements.ts`) — shared types only: `ElementInfo`, `LookPayload`, `ActResult`, `CaptureOptions`, `Clause`, `Bbox`. No LLM types, no Playwright dependency.
- `packages/browser`
  - `BrowserPool` — chromium lifecycle + idle reaping.
  - `PageSession` — the "eyes and hands" primitive. Wraps a live Playwright `Page`: structured element extraction (role/name/bbox/fingerprint, shadow-DOM piercing, capped at `--max-elements`, deduped by bbox), screenshot pipeline (multi-viewport, full-page, `--annotate` SVG overlay), console + network error capture (deduped, path-stripped, capped), and `resolveAndAct()` — the single engine shared by `act` element mode, `act` text mode, and `--after`.
- `apps/cli` — Commander CLI plus the session layer:
  - `commands.ts` — `runLook` / `runAct` / `runSessions` / `runKill`. One-shot paths (no `--session`) run a `PageSession` directly; session paths talk to the daemon.
  - `daemon.ts` — background unix-socket server holding one `PageSession` per session id. 10-min idle TTL, 60s reaper sweep, self-exits when idle. Socket at `<tmpdir>/tendo-daemon.sock`.
  - `client.ts` — socket client; auto-spawns the daemon on first `--session` use.
  - `format.ts` — TOON (default) and JSON rendering.
  - `shared.ts` — viewport parsing, capture-option building, escalation-ladder hints.

## Session Persistence

Agent turns are minutes apart, so a **daemon holds live browser instances** (chosen over CDP reattach, which loses element handles and the a11y snapshot across calls). One-shot `look`/`act` (no `--session`) never touch the daemon — they launch, capture, and kill inline. Element ids are per-capture ordinals; `act --element n` re-resolves the stored `role+name+tag+nth-path` fingerprint against a fresh snapshot, so staleness degrades to `not_found`/`ambiguous`, never a mis-click.

## Conventions

- **Commits:** `<type>(<scope>): <subject>`. Types: `feat`, `fix`, `refactor`, `chore`. Scopes: `cli`, `browser`, `core`.
- **Output discipline:** every response is machine-readable and token-minimal. Screenshot bytes are never inlined — only paths. Diagnostics are deduped and capped. Include contextual `hints:` that nudge callers down the escalation ladder (`--text-only` → `--region` → full `look` → `--annotate`).
- Match surrounding code; don't add abstractions without searching first. Don't run commands unless asked.

## Notes

- `SCOPE.md` is the design/roadmap record (session persistence rationale, unbuilt milestones M3 `--audit`/`--diff` and M4 skill+benchmark, open questions). It is forward-looking; this file documents current state.
- `.archive/` contains deprecated Python/Next.js code — ignore it.
- `apps/web` is the marketing landing page, orthogonal to the CLI.
