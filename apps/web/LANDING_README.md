# Tendo Landing Page

A minimalist, production-grade landing page for Tendo - Browser eyes and hands for coding agents.

## Setup

Install dependencies at the root of the monorepo:

```bash
npm install
```

## Development

Start the dev server:

```bash
npm run dev --workspace=@tendo/web
```

Open [http://localhost:3000](http://localhost:3000) to view the page.

## Build

```bash
npm run build --workspace=@tendo/web
```

## Design

One static `index.html` plus `style.css`, built with Vite. No framework, no animations.
Install command first, then a real `look` / `act` transcript, a short feature list, and
links to GitHub, npm, and the README. Light and dark follow `prefers-color-scheme`.

The transcript is trimmed real CLI output. Refresh it from a real run when the output format changes.
