import { defineConfig } from 'tsup';

// Bundle the CLI plus its workspace packages (@tendo/core, @tendo/browser) into
// standalone entrypoints so the published `tendo` package has no @tendo/* deps.
// Native deps stay external and are installed from the registry as normal.
export default defineConfig({
  entry: ['src/index.ts', 'src/daemon.ts'],
  format: ['esm'],
  target: 'node22',
  platform: 'node',
  outDir: 'dist',
  clean: true,
  external: ['playwright', 'sharp'],
  // No banner: src/index.ts already carries its own shebang; the daemon is
  // spawned via `node <path>` and needs none.
});
