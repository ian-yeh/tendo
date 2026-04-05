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

## Core Philosophical Principles

1.  **Aesthetics Matter**: ALL UI elements must look premium, modern, and high-fidelity. No placeholders. Use full-color palettes, smooth transitions, and rich typography.
2.  **Safety First**: Never run destructive commands without double-checking context.
3.  **Conventionality**: Follow the repository's `CONVENTIONAL_COMMITS.md` for all commits.
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
Follow the format: `type(scope): description`
Scopes: `api`, `web`, `cli`, `core`

## Tool Usage for Agents
- **Browser Tool**: Use it to verify UI changes in development.
- **Search Web**: Use it to find latest API documentation for libraries like `commander` or `@clack/prompts`.
- **Grep**: Use it to find existing patterns before implementing new ones.

---
*Built for humans, refined by agents.*
