'use strict';

// Ensure a chromium build is available for Playwright. `playwright install` is
// idempotent: if a matching chromium already exists in the shared ms-playwright
// cache (e.g. the user installed it via their own Playwright), it reuses that
// and skips the download. Non-fatal - a failed/offline download must not abort
// `npm install`; the CLI surfaces a clear "browser not found" error on first run.

if (process.env.TENDO_SKIP_CHROMIUM_INSTALL) {
  process.exit(0);
}

let cli;
try {
  cli = require.resolve('playwright/cli');
} catch {
  // playwright not installed yet (e.g. bare monorepo checkout before install
  // finishes) - nothing to do.
  process.exit(0);
}

const { spawnSync } = require('node:child_process');
const result = spawnSync(process.execPath, [cli, 'install', 'chromium'], {
  stdio: 'inherit',
});

if (result.status !== 0) {
  console.warn(
    '[tendo] Could not install Chromium automatically. ' +
      'Run `npx playwright install chromium` before using tendo.',
  );
}
