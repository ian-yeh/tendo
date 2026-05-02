---
name: agent-loop
description: Use when modifying or debugging the agent loop, loop detection, step limits, or action execution in packages/agent
---

# Agent Loop Skill

## Architecture
`AgentRunner` in `packages/agent` runs an event-driven loop capped at **30 steps**.

Each step:
1. `PageInteractor` captures screenshot + detects elements (max 40)
2. `VisionClient` calls LLM → returns `VisionDecision` (thought + action)
3. `AgentRunner` executes the `Action`
4. Repeat until `done`, `fail`, or step 30

## Action Types
| Action | Fields | Notes |
|--------|--------|-------|
| `click` | `x, y` | Coordinate-based only |
| `type` | `x, y, text` | Requires prior `click` to focus |
| `scroll` | `direction, amount` | `up`/`down`, pixels |
| `navigate` | `url` | Resets all page state |
| `wait` | — | For animations/lazy loads |
| `done` | `reason` | Success terminal state |
| `fail` | `message` | Failure terminal state |

## Loop Detection
Two mechanisms run in parallel — do not remove or weaken either:

**Fuzzy action fingerprinting** — hashes recent actions into fingerprints and compares. Detects repeated click/type patterns even with minor coordinate drift.

**Screenshot pixel sampling** — samples pixel values across screenshots to detect visually identical states. Catches loops where actions technically differ but produce no page change.

When either triggers, `AgentRunner` terminates with `fail`.

## Termination Conditions
- `done` action returned by LLM — success
- `fail` action returned by LLM — failure
- Step count reaches 30 — forced `fail`
- Loop detection triggers — forced `fail`

## Gotchas
- **Never increase the 30-step limit** without profiling — runaway agents burn LLM budget fast
- **`navigate` resets all state** — treat it as a fresh session; don't navigate mid-flow unless the prompt explicitly requires it
- **Loop detection is fuzzy, not exact** — don't add exact deduplication logic; false positives on near-identical actions are intentional and conservative
- **Do not add DOM-based bailout logic** — the loop is perception-only by design; no CSS selectors, no DOM queries in `AgentRunner`
- **`wait` is an action, not a JS timeout** — never add `setTimeout`/`page.waitForTimeout` in the loop; use the `wait` action type
- **Step count is 1-indexed in logs** — step 1 is the first capture, not step 0
- **Both terminal states (`done`/`fail`) must include a message** — never terminate silently

## Event-Driven Pattern
`AgentRunner` emits events at each step — preserve this for external consumers (CLI progress, watch mode):
```ts
runner.on('step', ({ step, action, thought }) => { ... });
runner.on('done', ({ reason, steps }) => { ... });
runner.on('fail', ({ message, steps }) => { ... });
```
Do not refactor into a promise-only interface — the CLI depends on step events for live output.

## Adding a New Action Type
1. Add to `Action` union type in `packages/core`
2. Handle in `PageInteractor.execute()` in `packages/browser`
3. Add to the prompt in `packages/prompt-engine` so the LLM knows it exists
4. Handle termination logic in `AgentRunner` if it's a terminal action
