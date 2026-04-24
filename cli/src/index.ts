#!/usr/bin/env node

import 'dotenv/config';

import { Command } from 'commander';
import * as p from '@clack/prompts';
import color from 'picocolors';

import { testCommand } from './commands/test.js';
import { watchCommand } from './commands/watch.js';
import { validateCommand } from './commands/validate.js';
import { reportCommand } from './commands/report.js';
import { configCommand } from './commands/config.js';

const program = new Command();

program
  .name('tendo')
  .description('Tendo CLI — autonomous QA agent for UX flow testing')
  .version('1.0.0');

program.addCommand(testCommand);
program.addCommand(watchCommand);
program.addCommand(validateCommand);
program.addCommand(reportCommand);
program.addCommand(configCommand);

program.parse();
