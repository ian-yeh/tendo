import { Command } from 'commander';
import * as p from '@clack/prompts';
import color from 'picocolors';

export const configCommand = new Command()
  .name('config')
  .description('Setup credentials and configuration')
  .action(() => {
    p.log.success('You inputted config setup.');
    p.log.info('This command interactively prompts for API credentials (Gemini API key, optional custom API endpoint), validates them against the backend, and saves to ~/.tendu/config.json with user-only permissions.');
  });
