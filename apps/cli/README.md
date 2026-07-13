# @ianyeh/tendo

Browser eyes and hands for coding agents. Tendo lets an agent (Claude Code, Codex, and friends) see a real web page and act on it, with zero setup. It ships no model and does no reasoning of its own: the agent decides what to do, Tendo captures page state and runs grounded browser actions deterministically.

Screenshots are written to disk and never dumped into the output, so the caller's context stays small.

## Install

Install the skill so your agent knows when to reach for tendo:

```bash
npx skills add ian-yeh/tendo --skill tendo -g
```

The skill runs the CLI through `npx -y @ianyeh/tendo`, so nothing else to install. Or skip the skill and run the CLI directly:

```bash
npx -y @ianyeh/tendo look https://example.com
```

No API key, no config. Chromium is fetched on first use, or reused if Playwright already has it.

## Usage

Two commands.

```bash
# Capture page state: element map, console/network errors, screenshot paths
tendo look <url>

# Run one grounded action and get the new page state back inline
tendo act <url> "click the login button"
tendo act --session my-session --element 3
```

Handy flags: `--session <id>` keeps a browser alive across calls, `--text-only` skips the screenshot for cheaper captures, `--annotate` adds a numbered overlay, `--full-page` grabs the whole scroll height.

```bash
tendo sessions        # list live sessions
tendo kill --all      # close them
```

## How it works

`look` prints a machine-readable summary: each element as `id, role, name, bbox`, plus deduped diagnostics and next-step hints. `act` targets an element by text ("click the checkout button") or by id (`--element 3`), re-resolving it against a fresh snapshot so a stale id degrades to a clean `not_found` instead of a mis-click.

## License

MIT
