---
name: tendo
description: "Vision-native browser eyes and hands via the tendo CLI - capture web page state (annotated screenshots, grounded element map, console/network errors) and execute deterministic actions by element id. Use whenever a task needs to see or drive a real web page in a browser: inspecting a rendered UI, filling forms, clicking through a flow, verifying something looks right, or checking canvas/visual state the DOM cannot describe."
user-invocable: false
metadata:
  hermes:
    tags: [browser, web, ui, testing, vision]
    category: web
---

# tendo

Browser eyes and hands for agents. **You** do the vision and reasoning; tendo captures page state and executes grounded actions deterministically. It ships no LLM.

Invoke it as `tendo <command>`. (Requires the CLI on PATH — built and linked from this repo — and Chromium installed once via `npx playwright install chromium`.)

## When to use

Use tendo whenever a task touches a live web page: reading a rendered UI, driving a multi-step flow (login, checkout, form submission), verifying something *renders* correctly (spacing, overlap, contrast, layout), or inspecting canvas/WebGL/video content the DOM can't describe. Prefer a plain DOM/selector tool for pure-DOM tasks on clean semantic HTML — tendo's edge is vision and grounded visual action.

## The core loop

1. `tendo look <url> --session s1 --annotate` — capture state. Writes screenshots to disk and prints an element map (`id, role, name, bbox`), console errors, failed requests, and next-step `hints:`.
2. **Read the annotated screenshot** with your own vision. The numbered boxes map to element ids: search box = `3`, checkout = `1`, etc.
3. `tendo act --session s1 --element 1` — click that exact element. The response is the fused post-action page state (never a bare "Done").
4. Repeat. Reason between calls; tendo does the capture and grounding.

Screenshot **bytes are never inlined** — `look`/`act` print file paths. Read the image only when you need pixels.

## Escalation ladder (default cheap)

Spend the fewest tokens that answer the question. Climb only when needed:

1. `--text-only` — element map + a11y, no screenshot. Most inspection tasks.
2. full `look` — screenshot + element map for the whole page.
3. `--annotate` — numbered overlay when you need to point your vision at specific targets.

Every response ends with `hints:` — follow them; they nudge you down a rung.

## Commands

```
commands[4]:
  look   = capture page state → screenshots on disk + element map + diagnostics
  act    = execute one grounded action, return the fused post-action look payload
  sessions = list live browser sessions + idle TTL
  kill   = close a session (<id>) or all (--all)
```

### look

```bash
tendo look <url>                        # one-shot: launch, capture, kill
tendo look <url> --session s1           # keep the browser alive for follow-up act
tendo look <url> --annotate             # numbered set-of-marks overlay on the screenshot
tendo look <url> --text-only            # cheapest: no screenshot
tendo look <url> --after "click sign in, type 'me@x.com' in email"  # grounded setup first
tendo look <url> --viewport 1440x900,390x844   # multi-viewport in one call
tendo look <url> --format json          # JSON instead of default TOON
```

Other flags: `--full-page`, `--out <dir>`, `--max-elements <n>`.

### act

```bash
tendo act --session s1 --element 3 --type "lofi beats"   # deterministic: type into element #3
tendo act --session s1 "click the checkout button"       # text mode: fuzzy role+name match
tendo act <url> "click Learn more"                       # one-shot: one action on a fresh load
```

Target by `--element <n>` (deterministic, re-resolves the captured element by fingerprint) or a text clause. Outcomes:

- `ok` — done; fused new state returned.
- `not_found` — the target is gone; a fresh capture is returned so you can re-target in one step.
- `ambiguous` — multiple matches; ranked `candidates` are returned. Pick one by id and retry with `--element`.
- `error` — a parse or runtime failure; see the `error` field.

### sessions / kill

```bash
tendo sessions        # list live sessions and TTL remaining
tendo kill s1          # close one
tendo kill --all       # close all — do this when finished
```

## Workflow rules

1. For anything past a single glance, use `--session <id>` so the browser persists across your turns. One-shot (no `--session`) launches and kills per call — element ids from one call are not valid in the next.
2. Act by `--element <n>` when you can — it is deterministic. Fall back to a text clause only when you have no captured id.
3. On `ambiguous`, do not guess coordinates — pick from the returned `candidates` by id.
4. On `not_found`, the returned capture is already fresh — re-read it and re-target; do not re-run `look`.
5. Clean up with `tendo kill --all` when the task is done. Sessions also idle-reap after 10 minutes.

## Tips

- Default output is TOON (token-efficient). Add `--format json` only when you need to pipe into `jq`.
- Diagnostics (`consoleErrors`, `failedRequests`) are deduped, path-stripped, and capped — they flag real breakage, not media/tracker noise.
- A live session survives navigation: `act` that changes the URL returns the new page's full state.
- `--after` shares the same grounded engine as `act` text mode: comma-separated clauses, one action each. A failed clause aborts and reports which one.
