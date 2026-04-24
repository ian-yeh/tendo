import { Command } from 'commander';
import * as p from '@clack/prompts';
import color from 'picocolors';

export const reportCommand = new Command()
  .name('report')
  .description('Generate shareable HTML report from a test run')
  .argument('[id]', 'The test run ID to generate report for')
  .action((id?: string) => {
    if (id) {
      p.log.success(`You inputted report ID: ${color.cyan(id)}.`);
    } else {
      p.log.success('You inputted a report request for the latest run.');
    }
    p.log.info('This command fetches the test run data from the API and renders an HTML report with screenshots, action logs, timing breakdowns, and a final verdict. Can be saved locally or uploaded for sharing.');
  });
