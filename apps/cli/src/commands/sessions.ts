import { daemonRequest } from '../client.js';

export async function runSessions(): Promise<void> {
  try {
    const data = await daemonRequest<{ sessions: { id: string; url: string; ttlRemainingMs: number }[] }>(
      { cmd: 'list' },
      false,
    );
    if (!data.sessions.length) {
      console.log('No live sessions.');
      return;
    }
    for (const s of data.sessions) {
      console.log(`${s.id}\t${Math.round(s.ttlRemainingMs / 1000)}s left\t${s.url}`);
    }
  } catch {
    console.log('No live sessions (daemon not running).');
  }
}

export async function runKill(id: string | undefined, opts: { all?: boolean }): Promise<void> {
  try {
    await daemonRequest({ cmd: 'kill', id, all: opts.all }, false);
    console.log(opts.all ? 'Killed all sessions.' : `Killed ${id}.`);
  } catch {
    console.log('Daemon not running.');
  }
}
