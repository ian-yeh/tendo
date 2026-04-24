#!/usr/bin/env node

import { Command } from 'commander';
import * as p from '@clack/prompts';
import color from 'picocolors';
import { BrowserPool } from '../agent/BrowserPool.js';
import { getAgentConfig, VisionClient, PageInteractor } from '../agent/index.js';
import type { AgentState, TestResult } from '../agent/types.js';

const MAX_STEPS = 30;

export const testCommand = new Command()
  .name('test')
  .description('Run a prompt-driven autonomous test against a URL')
  .argument('<url>', 'The URL to test')
  .requiredOption('-p, --prompt <prompt>', 'The test prompt (e.g., "add to cart and checkout")')
  .option('--headless', 'Run browser in headless mode', true)
  .option('--viewport <viewport>', 'Viewport size (e.g., "1920,1080")', '1920,1080')
  .option('-o, --output <file>', 'Save result to JSON file')
  .action(async (url: string, options) => {
    p.intro(color.bgCyan(color.black(' Tendo QA Agent ')));

    // ── Validate inputs ──────────────────────────────────────────

    const config = getAgentConfig();
    if (!config.apiKey) {
      p.log.error(color.red('Error: GOOGLE_API_KEY or GEMINI_API_KEY environment variable is required'));
      p.outro('Test aborted.');
      process.exit(1);
    }

    let targetUrl = url;
    try {
      if (!/^https?:\/\//i.test(targetUrl)) targetUrl = `https://${targetUrl}`;
      new URL(targetUrl);
    } catch {
      p.log.error(`Invalid URL: ${color.red(url)}`);
      p.outro('Test aborted.');
      process.exit(1);
    }

    const [w, h] = options.viewport.split(',').map(Number);
    const viewport = { width: w || 1920, height: h || 1080 };

    // ── Bootstrap services ───────────────────────────────────────

    const s = p.spinner();
    s.start('Initializing browser and AI agent...');

    const pool = new BrowserPool({ maxBrowsers: 1, maxPagesPerBrowser: 1 });
    const vision = new VisionClient(config);
    const interactor = await PageInteractor.create(pool, { headless: options.headless, viewport });

    s.stop('Browser and agent initialized');
    p.log.info(`Testing: ${color.cyan(targetUrl)}`);
    p.log.info(`Prompt: "${color.yellow(options.prompt)}"`);
    p.log.message('');

    // ── Agent state ──────────────────────────────────────────────

    const state: AgentState = {
      page: null as any, // managed by PageInteractor
      currentUrl: targetUrl,
      step: 0,
      actions: [],
      screenshots: [],
      completed: false,
      success: false,
    };

    try {
      // Initial navigation
      const navSpinner = p.spinner();
      navSpinner.start('Navigating to target URL...');
      await interactor.navigateTo(targetUrl);
      navSpinner.stop('Page loaded');

      // ── Agent loop ───────────────────────────────────────────

      while (state.step < MAX_STEPS && !state.completed) {
        state.step++;
        const stepSpinner = p.spinner();
        stepSpinner.start(`Step ${state.step}: Analyzing page...`);

        try {
          // 1. Perceive
          const context = await interactor.captureContext();
          state.screenshots.push(context.screenshotBase64);

          // 2. Decide
          const { thought, action } = await vision.decideNextAction(
            options.prompt,
            context,
            state.actions,
            MAX_STEPS - state.step,
          );

          stepSpinner.stop(`Step ${state.step}: ${action.type.toUpperCase()}`);
          p.log.info(color.dim(`Thought: ${thought}`));
          if (action.reason) p.log.info(color.dim(`Reason: ${action.reason}`));

          // 3. Act
          await interactor.executeAction(action);
          state.actions.push(JSON.stringify({ step: state.step, action, thought }));

          // 4. Evaluate
          if (action.type === 'done') {
            state.completed = true;
            state.success = true;
            p.log.success(color.green('Test completed successfully!'));
            if (action.message) p.log.message(color.green(`✓ ${action.message}`));
          } else if (action.type === 'fail') {
            state.completed = true;
            state.success = false;
            p.log.error(color.red(`Test failed: ${action.reason || 'Unknown reason'}`));
          }
        } catch (error) {
          stepSpinner.stop(`Step ${state.step} failed`);
          p.log.error(`Error at step ${state.step}: ${(error as Error).message}`);
          state.completed = true;
          state.success = false;
        }

        if (!state.completed) await new Promise(r => setTimeout(r, 500));
      }

      if (state.step >= MAX_STEPS && !state.completed) {
        p.log.warn('Reached maximum step limit');
        state.completed = true;
        state.success = false;
      }

      // ── Summary ────────────────────────────────────────────────

      p.log.message('');
      p.log.info(color.bold('Test Result:'));
      p.log.message(`Status: ${state.success ? color.green('PASS') : color.red('FAIL')}`);
      p.log.message(`Steps taken: ${state.step}/${MAX_STEPS}`);
      p.log.message(`Final URL: ${color.cyan(interactor.currentUrl())}`);

      // ── Optional JSON output ───────────────────────────────────

      if (options.output) {
        const result: TestResult = {
          success: state.success,
          url: targetUrl,
          prompt: options.prompt,
          steps: state.step,
          actions: state.actions.map(a => JSON.parse(a)),
          finalUrl: interactor.currentUrl(),
          timestamp: new Date().toISOString(),
        };
        const fs = await import('fs');
        fs.writeFileSync(options.output, JSON.stringify(result, null, 2));
        p.log.success(`Results saved to ${options.output}`);
      }

      await interactor.release();
    } catch (error) {
      p.log.error(`Fatal error: ${(error as Error).message}`);
      state.success = false;
    } finally {
      await pool.dispose();
      p.outro(state.success ? 'Test completed successfully' : 'Test failed');
      process.exit(state.success ? 0 : 1);
    }
  });
