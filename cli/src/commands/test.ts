import { Command } from 'commander';
import * as p from '@clack/prompts';
import color from 'picocolors';

export const testCommand = new Command()
  .name('test')
  .description('Run a prompt-driven, one-off test against a URL')
  .argument('<url>', 'The URL to test')
  .action((url: string) => {
    p.log.success(`You inputted ${color.cyan(url)}.`);
    p.log.info('This command will send the URL to the Tendu API, accept a natural language prompt describing the UX flow to test, execute the test via Gemini Vision + Playwright, and return pass/fail with a step-by-step breakdown.');
  });
