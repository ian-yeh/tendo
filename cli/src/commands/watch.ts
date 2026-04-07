import { Command } from 'commander';
import * as p from '@clack/prompts';
import color from 'picocolors';

export const watchCommand = new Command()
  .name('watch')
  .description('Start live feed mode for real-time test monitoring')
  .argument('<url>', 'The URL to watch')
  .action((url: string) => {
    p.log.success(`You inputted ${color.cyan(url)}.`);
    p.log.info('This command opens a WebSocket connection to stream screenshots and agent actions in real-time. Useful for debugging test runs as they happen — you see what the agent sees and can intervene if needed.');
  });
