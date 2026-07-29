#!/usr/bin/env node

import { Command } from 'commander';

import { runLook, runAct, runSessions, runKill } from './commands/index.js';

const program = new Command();

program
  .name('tendo')
  .description('Tendo - eyes and hands for coding agents. Capture web page state and execute grounded actions. Zero setup.')
  .version('2.0.0');

program
  .command('look')
  .description('Capture page state → artifacts on disk + machine-readable summary on stdout')
  .argument('<url>', 'URL to capture')
  .option('--session <id>', 'Reattach to a live browser session (default: no session, browser killed after capture)')
  .option('--after <seq>', 'Comma-separated grounded setup actions before capture')
  .option('--region <selector>', 'Crop screenshot to the element bbox')
  .option('--annotate', 'Numbered set-of-marks overlay on interactive elements')
  .option('--text-only', 'A11y/element tree only, no screenshot (cheapest tier)')
  .option('--viewport <list>', 'One or more viewports, comma-separated (e.g. 1440x900,390x844)')
  .option('--full-page', 'Capture beyond the fold')
  .option('--out <dir>', 'Artifact output directory')
  .option('--format <fmt>', 'Output format: toon | json (default: toon)')
  .option('--diff <prevOut>', 'Pixel + layout diff vs a previous capture dir')
  .option('--audit', 'axe-core contrast/tap-target violations + CLS/LCP')
  .option('--max-elements <n>', 'Cap on element map size (default: 40)')
  .action(runLook);

program
  .command('act')
  .description('Execute one grounded action, return the post-action look payload inline')
  .argument('[target]', 'URL (one-shot). Omit when using --session.')
  .argument('[action]', 'Text action, e.g. "click the checkout button"')
  .option('--session <id>', 'Act against a live session instead of a URL')
  .option('--element <n>', 'Click/type by annotated element id from the last capture')
  .option('--type <text>', 'Text to type (combine with --element or a type clause)')
  .option('--format <fmt>', 'Output format: toon | json (default: toon)')
  .option('--text-only', 'Omit screenshot from the returned look payload')
  .option('--annotate', 'Numbered overlay in the returned look payload')
  .option('--viewport <list>', 'Viewport(s) for the returned capture')
  .option('--full-page', 'Full-page returned capture')
  .option('--out <dir>', 'Artifact output directory')
  .option('--max-elements <n>', 'Cap on element map size (default: 40)')
  .action(runAct);

program
  .command('sessions')
  .description('List live browser sessions and their TTL')
  .action(runSessions);

program
  .command('kill')
  .description('Kill a live session (or --all)')
  .argument('[id]', 'Session id to kill')
  .option('--all', 'Kill every session')
  .action(runKill);

program.parse();
