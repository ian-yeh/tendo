import { Command } from 'commander';
import { runTest } from './test.js';
import { runReport } from './report.js';
import { runConfigInit, runConfigShow } from './config.js';

export const testCommand = new Command()
  .name('test')
  .description('Run a prompt-driven autonomous test against a URL')
  .argument('<url>', 'The URL to test')
  .requiredOption('-p, --prompt <prompt>', 'The test prompt')
  .option('--watch', 'Visible browser with per-step screenshots and verbose output')
  .option('--viewport <viewport>', 'Viewport size (W,H)')
  .option('-o, --output <file>', 'Save result to JSON file')
  .action(runTest);

export const reportCommand = new Command()
  .name('report')
  .description('Run a test and generate an HTML report, or report from a saved result')
  .argument('[id]', 'URL (with -p), path to result.json, session number, or omit for latest')
  .option('-p, --prompt <prompt>', 'Run a live test against the URL')
  .option('--watch', 'Visible browser with per-step screenshots and verbose output')
  .option('--viewport <viewport>', 'Viewport size when running live (W,H)')
  .option('-o, --output <file>', 'Output HTML file path')
  .option('--no-open', 'Do not open the report in a browser')
  .action(runReport);

export const configCommand = new Command()
  .name('config')
  .description('Manage tendo project configuration');

configCommand
  .command('init')
  .description('Create ~/.tendo/config.json with default scaffolding')
  .action(runConfigInit);

configCommand
  .command('show')
  .description('Show the current resolved configuration')
  .action(runConfigShow);
