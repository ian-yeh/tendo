# @ianyeh/tendo

Eyes and hands for coding agents. Tendo lets an LLM (Claude Code, Codex, and friends) see a real web page and act on it, with zero setup. It ships no model and does no reasoning of its own: the calling agent decides what to do, Tendo captures page state and executes grounded browser actions deterministically.

Design goal: the fewest possible caller tokens per unit of visual understanding. Screenshots are written to disk and never inlined, so your context stays small.

## Install

```bash
npx -y @ianyeh/tendo look https://example.com
```

No API key, no config. Chromium is fetched on first install (and reused if you already have it via Playwright).

## Usage

Two commands.

```bash
# Capture page state: element map, console/network errors, screenshot paths
tendo look <url>

# Execute one grounded action, get the post-action state back inline
tendo act <url> "click the login button"
tendo act --session my-session --element 3
```

Useful flags: `--session <id>` keeps a browser alive across calls, `--text-only` skips the screenshot for cheaper captures, `--annotate` adds a numbered overlay, `--full-page` captures the whole scroll height.

```bash
tendo sessions        # list live sessions
tendo kill --all      # close them
```

## How it works

`look` returns a machine-readable summary: each element as `id, role, name, bbox`, plus deduped diagnostics and next-step hints. `act` targets an element either by text ("click the checkout button") or by id (`--element 3`), re-resolving it against a fresh snapshot so a stale id degrades to a clean `not_found`, never a mis-click.

## License

MIT
