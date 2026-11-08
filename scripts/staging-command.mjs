import fs from 'node:fs';
import { spawn } from 'node:child_process';
const env = JSON.parse(fs.readFileSync('.staging/saas-20261104/env.json', 'utf8'));
const url = new URL(env.DATABASE_URL);
if (url.hostname !== '127.0.0.1' || url.port !== '55433' || url.pathname !== '/quanlihocau_staging_saas') {
  throw new Error('Refusing a database outside the dedicated local staging cluster');
}
const child = spawn(process.execPath, process.argv.slice(2), { env, stdio: 'inherit', windowsHide: true });
child.on('exit', (code) => { process.exitCode = code ?? 1; });
