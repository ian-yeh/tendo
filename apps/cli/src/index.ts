#!/usr/bin/env node

import 'dotenv/config';

import { Command } from 'commander';

import { testCommand, reportCommand, configCommand } from './commands/index.js';

const program = new Command();

program
  .name('tendo')
  .description('Tendo CLI — autonomous QA agent for UX flow testing')
  .version('1.0.0');

program.addCommand(testCommand);
program.addCommand(reportCommand);
program.addCommand(configCommand);

program.parse();
