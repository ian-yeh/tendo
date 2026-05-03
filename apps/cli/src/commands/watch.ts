import { Command } from 'commander';
import * as p from '@clack/prompts';
import color from 'picocolors';
import { AgentRunner } from '@tendo/agent';
import { createProvider } from '../agent/config.js';

export const watchCommand = new Command()
  .name('watch')
  .description('Run a test in debug mode with a visible browser')
  .argument('<url>', 'The URL to test')
  .requiredOption('-p, --prompt <prompt>', 'The test prompt')
  .option('--viewport <viewport>', 'Viewport size', '1920,1080')
  .action(async (url: string, options) => {
    p.intro(color.bgMagenta(color.black(' Tendo Watch Mode ')));

    let provider;
    try {
      provider = createProvider();
    } catch (error) {
      p.log.error(color.red((error as Error).message));
      p.outro('Watch aborted.');
      process.exit(1);
    }

    let targetUrl = url;
    if (!/^https?:\/\//i.test(targetUrl)) targetUrl = `https://${targetUrl}`;

    const [w, h] = options.viewport.split(',').map(Number);
    const viewport = { width: w || 1920, height: h || 1080 };

    const runner = new AgentRunner(provider);
    const s = p.spinner();

    runner.on('init', () => {
      p.log.info(`${color.dim('URL:')}    ${color.cyan(targetUrl)}`);
      p.log.info(`${color.dim('Prompt:')} ${color.yellow(options.prompt)}`);
      p.log.message('');
    });

    runner.on('step:start', ({ step }) => {
      s.start(`Step ${step}: Analyzing page...`);
    });

    runner.on('step:decision', ({ step, thought, action }) => {
      s.stop(`Step ${step}: ${color.bold(action.type.toUpperCase())}`);
      p.log.info(color.dim(`  Thought: ${thought}`));

      if (action.x != null && action.y != null) {
        p.log.info(color.dim(`  Coords:  (${action.x}, ${action.y})`));
      }
      if (action.text) {
        p.log.info(color.dim(`  Text:    "${action.text}"`));
      }
      if (action.reason) {
        p.log.info(color.dim(`  Reason:  ${action.reason}`));
      }
      p.log.message('');
    });

    runner.on('error', ({ step, error }) => {
      s.stop(`Step ${step} failed`);
      p.log.error(color.red(`  Error: ${error.message}`));
    });

    let finalState;
    try {
      finalState = await runner.run({
        url: targetUrl,
        prompt: options.prompt,
        headless: false,
        viewport,
      });
    } catch (error) {
      p.log.error(color.red(`Fatal error: ${(error as Error).message}`));
      p.outro('Watch aborted.');
      process.exit(1);
    }

    p.log.message('');
    p.log.info(color.bold('Result:'));
    p.log.message(`  Status: ${finalState.success ? color.green('PASS ✓') : color.red('FAIL ✗')}`);
    p.log.message(`  Steps:  ${finalState.step}`);

    p.outro(finalState.success ? 'Watch completed successfully' : 'Watch completed with failure');
    process.exit(finalState.success ? 0 : 1);
  });
