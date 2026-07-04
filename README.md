<h1 align="center">tendo</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/tendo"><img alt="npm" src="https://img.shields.io/npm/v/tendo?style=flat-square" /></a>
  <a href="https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-blue?style=flat-square"><img alt="Platform" src="https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-blue?style=flat-square" /></a>
  <a href="https://img.shields.io/badge/node-20%2B-blue?style=flat-square"><img alt="Node" src="https://img.shields.io/badge/node-20%2B-blue?style=flat-square" /></a>
</p>

Vision-native browser eyes and hands for agents.

Tendo captures web page state — annotated screenshots, a grounded element map, console and network errors — and executes deterministic actions by element id. The calling agent does the vision and reasoning; Tendo is the eyes and hands. It ships **no LLM**: no API key, no config, no per-token cost of its own. Built for autonomous agents that drive a browser via shell execution.

## Why

A DOM/selector tool is cheaper on clean semantic HTML — use one there. Tendo wins where the DOM lies or isn't the truth:

- **Canvas / WebGL / video** — charts, maps, games, design tools. No DOM nodes to select; only pixels.
- **Visual assertions** — "does the total actually render, not overlap, have enough contrast, and not shift on load."
- **State setup** — `--after "type email, click sign in, add to cart"` gets you to a primed page in one call.

It grounds actions on role + name + visual position, so the caller clicks the exact right pixels without guessing coordinates or parsing DOM.

## Quick Start

No install needed — any capable agent can run the CLI directly:

```
Execute `npx -y tendo look <url>` to get browser eyes and hands.
```

Tendo drives Chromium via Playwright (Node 20+). On first run, install the browser once:

```sh
npx playwright install chromium
```

## Usage

```bash
tendo look https://example.com                      # capture: element map + screenshot + errors
tendo look https://example.com --annotate           # numbered set-of-marks overlay on the screenshot
tendo look https://example.com --text-only          # cheapest tier: no screenshot
tendo look https://example.com --session s1          # keep the browser alive for follow-up act
tendo look https://shop.com --after "click sign in"  # grounded setup actions before capture

tendo act --session s1 --element 3 --type "lofi"     # deterministic: type into element #3
tendo act --session s1 "click the checkout button"   # text mode: fuzzy role+name match
tendo act https://example.com "click Learn more"     # ephemeral: one action on a fresh load

tendo sessions                                       # list live sessions + TTL remaining
tendo kill s1 | tendo kill --all                     # close sessions
```

Every `look` writes screenshots to disk and prints a machine-readable summary (TOON by default, `--format json` to opt out). Screenshot **bytes are never inlined** — only paths, which the agent reads on demand. Every `act` returns the fused post-action state inline, never a bare "Done".

### The loop

1. `tendo look <url> --session s1 --annotate` — get the numbered screenshot + element map.
2. The agent reads the annotated image with its own vision: search box = `3`, checkout = `1`.
3. `tendo act --session s1 --element 1` — click the exact element, get the new state back.
4. Repeat. Reasoning lives in the agent; grounding and capture live in Tendo.

### Escalation ladder

Default to the cheapest tier and only spend pixels when needed: `--text-only` → `--region <selector>` → full `look` → `--annotate`. Every response includes `hints:` that nudge you down a rung.

### Commands

| Command    | Description                                                              |
| ---------- | ------------------------------------------------------------------------ |
| `look`     | Capture page state → screenshots on disk + element map + diagnostics     |
| `act`      | Execute one grounded action, return the fused post-action `look` payload  |
| `sessions` | List live browser sessions and their idle TTL                            |
| `kill`     | Close a session (`<id>`) or all sessions (`--all`)                        |

### Outcomes

`act` reports one of: `ok` · `not_found` (element gone → fresh state returned) · `ambiguous` (ranked candidates returned, pick by id) · `error`.

### Global flags

- `--help` — show help for any command
- `-V`, `--version` — show the installed `tendo` version

## Sessions

`--session <id>` keeps a browser alive across calls (agent turns are minutes apart). A background daemon holds the live page and auto-spawns on first use; sessions idle-reap after 10 minutes. Without `--session`, `look`/`act` are ephemeral — launch, capture, kill.

## Development

```sh
npm install                                  # install all workspace dependencies
npm run build --workspaces                   # build core → browser → cli
node apps/cli/dist/index.js look <url>       # run the built CLI
```

See [AGENTS.md](./AGENTS.md) for architecture and contributor guidance, and [SCOPE.md](./SCOPE.md) for the design record and roadmap.

## License

MIT
