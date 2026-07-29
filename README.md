<h1 align="center">tendo</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/tendo"><img alt="npm" src="https://img.shields.io/npm/v/tendo?style=flat-square" /></a>
  <a href="https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-blue?style=flat-square"><img alt="Platform" src="https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-blue?style=flat-square" /></a>
  <a href="https://img.shields.io/badge/node-22%2B-blue?style=flat-square"><img alt="Node" src="https://img.shields.io/badge/node-22%2B-blue?style=flat-square" /></a>
</p>

Browser eyes and hands for coding agents.

Tendo captures what a web page looks like (screenshots, a grounded element map, console and network errors) and clicks or types on it by element id. It has no LLM of its own: the agent calling it does the looking and the thinking, Tendo just sees and acts. That means no API key, no config, and no token cost from Tendo itself. `npx -y @ianyeh/tendo` works out of the box.

## When to use it

If the page is clean semantic HTML, a plain DOM or selector tool is cheaper and you should use that. Tendo earns its keep when the DOM isn't the whole story:

- **Canvas, WebGL, video** - charts, maps, games, design tools. There's nothing to select, only pixels.
- **Visual checks** - does the total actually render, line up, have enough contrast, and stay put on load.
- **Getting to a starting state** - `--after "type email, click sign in, add to cart"` primes a page in one call.

Tendo grounds every action on an element's role, name, and position, so the agent hits the right pixels without guessing coordinates or scraping the DOM.

## Quick start

Install the tendo skill so your agent knows when and how to reach for it:

```sh
npx skills add ian-yeh/tendo --skill tendo -g
```

That is the whole setup. The skill teaches the agent to run tendo through `npx -y @ianyeh/tendo`, so the CLI comes along on demand. Drop the `-g` to install for the current project only.

`-g` installs globally (`~/.claude/skills/`); without it the skill lands in `.claude/skills/` for this project.

Prefer no skill? Any capable agent can run the CLI directly:

```
Run `npx -y @ianyeh/tendo look <url>` for browser eyes and hands.
```

Tendo drives Chromium through Playwright (Node 22.12+). First use fetches it automatically; if that fails, install it once with `npx playwright install chromium`.

## Usage

```bash
tendo look https://example.com                       # element map + screenshot + errors
tendo look https://example.com --annotate            # numbered overlay on the screenshot
tendo look https://example.com --text-only           # cheapest: no screenshot
tendo look https://example.com --session s1          # keep the browser alive for a follow-up act
tendo look https://shop.com --after "click sign in"  # run setup actions before capturing

tendo act --session s1 --element 3 --type "lofi"     # type into element #3
tendo act --session s1 "click the checkout button"   # fuzzy match by role + name
tendo act https://example.com "click Learn more"     # one-shot on a fresh load

tendo sessions                                       # list live sessions + TTL
tendo kill s1 | tendo kill --all                     # close sessions
```

Every `look` writes screenshots to disk and prints a machine-readable summary (TOON by default, or `--format json`). The image bytes are never dumped into the output, only the paths, so the agent reads a screenshot when it actually needs the pixels. Every `act` returns the new page state inline, never a bare "Done".

### The loop

1. `tendo look <url> --session s1 --annotate` gives you a numbered screenshot and an element map.
2. The agent looks at the image: search box is `3`, checkout is `1`.
3. `tendo act --session s1 --element 1` clicks it and returns the new state.
4. Repeat. The agent reasons; Tendo captures and grounds.

### Spend pixels only when you need them

Start cheap and climb: `--text-only` → `--region <selector>` → full `look` → `--annotate`. Every response carries `hints:` that point you to the next rung.

### Commands

| Command    | What it does                                                        |
| ---------- | ------------------------------------------------------------------- |
| `look`     | Capture page state: screenshots on disk, element map, diagnostics   |
| `act`      | Run one grounded action and return the new page state               |
| `sessions` | List live browser sessions and their idle TTL                       |
| `kill`     | Close a session (`<id>`) or all of them (`--all`)                   |

### Act outcomes

`ok`, `not_found` (element gone, fresh state returned), `ambiguous` (ranked candidates returned, pick one by id), or `error`.

### Global flags

- `--help` shows help for any command
- `-V`, `--version` prints the installed version

## Sessions

Agent turns can be minutes apart, so `--session <id>` keeps a browser alive between calls. A background daemon holds the live page, spawns itself on first use, and reaps sessions after 10 minutes idle. Without `--session`, `look` and `act` run one-shot: launch, capture, kill.

## Development

```sh
npm install                                  # install workspace dependencies
npm run build --workspaces                   # build core → browser → cli
node apps/cli/dist/index.js look <url>       # run the built CLI
```

See [AGENTS.md](./AGENTS.md) for architecture and [SCOPE.md](./SCOPE.md) for the design record and roadmap.

## License

MIT
