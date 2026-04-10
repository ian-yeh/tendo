# AI Agent Development Guidelines (AGENTS.md)

This project is built to be "Agent-First." These guidelines help AI coding assistants (like Gemini, Perplexity, or Antigravity) understand how to best contribute to the codebase.

## Project Structure (Monorepo)

- `apps/api`: Python FastAPI backend.
  - Handles Gemini Vision API interactions.
  - Manages Playwright browser instances.
  - Uses Socket.io for real-time updates.
- `apps/web`: Next.js frontend (Next.js 15, App Router).
  - Displays the live test feed and action history.
  - Provides the interactive UI for starting tests.
- `apps/cli`: TypeScript CLI tool.
  - Terminal interface for running live test feeds for UI/UX testing.
  - **Current State:** Contains a built-in Playwright web scraping layer (`src/scraper`) for robust static and dynamic content extraction. The `test` command is refactored to extract core website elements (titles, headings, paragraphs, buttons) from user-provided URLs with robust error handling and proxy support.

## Core Philosophical Principles

1.  **Aesthetics Matter**: ALL UI elements must look premium, modern, and high-fidelity. No placeholders. Use full-color palettes, smooth transitions, and rich typography.
2.  **Safety First**: Never run destructive commands without double-checking context.
3.  **Conventionality**: Follow the Conventional Commits specification below for all commits.
4.  **No Placeholders**: If you need an image, generate it. If you need a component, build it fully with logic.

## Developing for the Agent Loop

The `apps/api/app/services/agent.py` file is the brain of the system.
- It converts high-level user instructions into discrete browser actions.
- It uses screenshots + Gemini Vision to perceive the current state.
- Focus on making the agent more resilient (e.g., handling pop-ups, retrying on failure).

## Key Development Workflows

### 1. Adding a New Feature
- Always start with a `PLAN.md` or implementation plan.
- Update the `task.md` frequently.
- Ensure cross-repo compatibility (if changing the API, update `web` and `cli`).

### 2. Commit Message Structure

This project follows the [Conventional Commits](https://www.conventionalcommits.org/) specification.

**Format:**
```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

**Types:**
| Type | Description | Example |
| :--- | :--- | :--- |
| **feat** | A new feature | `feat(api): add screenshot streaming` |
| **fix** | A bug fix | `fix(web): resolve login redirect issue` |
| **docs** | Documentation changes | `docs: update setup instructions` |
| **style** | Formatting, missing semi-colons, etc. | `style: lint check fix` |
| **refactor** | Code change that neither fixes a bug nor adds a feature | `refactor: modularize browser service` |
| **perf** | Code change that improves performance | `perf: optimized Gemini vision requests` |
| **test** | Adding or correcting tests | `test: add unit tests for agent logic` |
| **chore** | Build scripts, dependencies, CI etc. | `chore: update playwright to v1.42` |
| **revert** | Reverting a previous commit | `revert: feat: add experimental feature` |

**Scopes:**
- `api` - Python FastAPI backend changes
- `web` - Next.js frontend changes
- `cli` - TypeScript CLI tool changes
- `core` - Shared logic/config across packages
- `ci`, `dx` - CI/CD or developer experience

**Rules:**
1.  **Subject**: Use imperative tense ("add", not "added"). Don't capitalize. No period at the end. Keep under 50 characters.
2.  **Body**: Explain the "what" and "why", not the "how".
3.  **Breaking**: Use `!` after type/scope or `BREAKING CHANGE:` footer.

## Tool Usage for Agents
- **Browser Tool**: Use it to verify UI changes in development.
- **Search Web**: Use it to find latest API documentation for libraries like `commander` or `@clack/prompts`.
- **Grep**: Use it to find existing patterns before implementing new ones.

---
*Built for humans, refined by agents.*
