import net from 'node:net';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { SOCKET_PATH } from './shared.js';

function tryConnect(): Promise<net.Socket> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(SOCKET_PATH);
    socket.once('connect', () => resolve(socket));
    socket.once('error', reject);
  });
}

function spawnDaemon(): void {
  // Sibling daemon module in the same directory (daemon.js in dist, daemon.ts under tsx).
  // Resolved by directory rather than filename so it survives bundling into index.js.
  const self = fileURLToPath(import.meta.url);
  const ext = self.endsWith('.ts') ? 'ts' : 'js';
  const daemonPath = path.join(path.dirname(self), `daemon.${ext}`);
  const child = spawn(process.execPath, ext === 'ts'
    ? ['--import', 'tsx', daemonPath]
    : [daemonPath], {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
}

async function connect(autospawn: boolean): Promise<net.Socket> {
  try {
    return await tryConnect();
  } catch {
    if (!autospawn) throw new Error('Tendo daemon is not running.');
  }
  spawnDaemon();
  // poll for the socket to come up
  for (let i = 0; i < 50; i++) {
    await new Promise((r) => setTimeout(r, 100));
    try {
      return await tryConnect();
    } catch {}
  }
  throw new Error('Failed to start Tendo daemon.');
}

export async function daemonRequest<T = unknown>(req: Record<string, unknown>, autospawn = true): Promise<T> {
  const socket = await connect(autospawn);
  return new Promise<T>((resolve, reject) => {
    let buf = '';
    socket.on('data', (chunk) => {
      buf += chunk.toString();
      const idx = buf.indexOf('\n');
      if (idx < 0) return;
      socket.end();
      try {
        const res = JSON.parse(buf.slice(0, idx));
        if (res.ok) resolve(res.data as T);
        else reject(new Error(res.error));
      } catch (err) {
        reject(err as Error);
      }
    });
    socket.on('error', reject);
    socket.write(JSON.stringify(req) + '\n');
  });
}
