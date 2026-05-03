---
name: cli-conventions
description: Use when adding or modifying commands, output, or UX in apps/cli
---

# Tendo CLI Skill

## Structure
- Entry: `apps/cli/src/index.ts` — Commander setup + dotenv init
- Provider factory: `apps/cli/src/agent/config.ts` — reads env vars, returns `LLMProvider`
- Commands: `test`, `watch` (implemented), three stubs

## Adding a New Command
Register in `index.ts` via Commander:
```ts
program
  .command('scan <url>')
  .description('...')
  .option('-p, --prompt <prompt>', 'plain-english goal')
  .action(async (url, opts) => {
    // always wrap in clack intro/outro
  });
```

## Output Conventions
Always use `@clack/prompts` + `picocolors` — never `console.log` directly:
```ts
import * as p from '@clack/prompts';
import pc from 'picocolors';

p.intro(pc.bgCyan(pc.black(' tendo ')));
p.log.step('Navigating to URL...');
p.log.success('Flow completed');
p.log.error('Agent failed: ' + reason);
p.outro('Done');
```

## LLM Provider Config
Read via env vars in `config.ts` — never hardcode:
| Var | Values |
|-----|--------|
| `LLM_PROVIDER` | `gemini` (default) or `groq` |
| `GEMINI_MODEL` | `gemini-2.5-flash` |
| `GROQ_MODEL` | `meta-llama/llama-4-scout-17b-16e-instruct` |

## Watch Mode
`tendo watch` = visible browser + saves screenshots to `./tendo-watch/` — do not add screenshot saves elsewhere.

## Gotchas
- Never add placeholder/stub implementations — stubs should throw `new Error('not implemented')` or be left as Commander skeletons
- Don't add a test runner yet — no test framework is configured
- ESM + NodeNext — no `require()`, no default CJS imports
- Run with `npm run dev --workspace=apps/cli` for tsx (no compile); `npm run build --workspace=apps/cli` before testing built output
