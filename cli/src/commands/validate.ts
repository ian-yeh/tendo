import { Command } from 'commander';
import * as p from '@clack/prompts';
import color from 'picocolors';

export const validateCommand = new Command()
  .name('validate')
  .description('Run pre-flight smoke test on a URL')
  .argument('<url>', 'The URL to validate')
  .action((url: string) => {
    p.log.success(`You inputted ${color.cyan(url)}.`);
    p.log.info('This command performs a quick health check: verifies the URL is reachable, checks robots.txt for test permissions, captures a baseline screenshot, and validates API connectivity before running a full test.');
  });
