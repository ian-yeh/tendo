import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const cli = fileURLToPath(new URL('../apps/cli/dist/index.js', import.meta.url));
const url = new URL('fixture.html', import.meta.url).href;
const out = JSON.parse(execFileSync(process.execPath, [cli, 'look', url, '--format', 'json'], { encoding: 'utf8' }));

assert.equal(out.title, 'Tendo smoke');
const has = (role, name) => out.elements.some((e) => e.role === role && e.name === name);
assert.ok(has('button', 'Checkout'), 'button');
assert.ok(has('link', 'Docs'), 'link');
assert.ok(has('textbox', 'Email'), 'textbox');
assert.ok(out.screenshots.length > 0, 'screenshots');
console.log('smoke ok');
