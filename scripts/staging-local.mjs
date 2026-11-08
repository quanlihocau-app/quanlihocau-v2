import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import pg from 'pg';
import { isolatedEnvironment } from './isolated-environment.mjs';

const root = process.cwd();
const dir = path.join(root, '.staging', 'saas-20261104');
const bin = process.env.PG_BIN || 'C:/Program Files/PostgreSQL/16/bin';
const exe = (name) => path.join(bin, name + (process.platform === 'win32' ? '.exe' : ''));
const run = (name, args) => {
  const result = spawnSync(exe(name), args, { windowsHide: true, stdio: 'ignore' });
  if (result.status !== 0) throw new Error(`${name}: ${result.stderr || result.stdout || result.error}`);
};
fs.mkdirSync(dir, { recursive: true });
const configPath = path.join(dir, 'config.json');
let config;
if (fs.existsSync(configPath)) config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
else {
  config = { password: crypto.randomBytes(24).toString('hex'), port: 55433,
    secret: crypto.randomBytes(32).toString('hex'), webhook: crypto.randomBytes(32).toString('hex') };
  fs.writeFileSync(configPath, JSON.stringify(config), { mode: 0o600 });
}
const cluster = path.join(dir, 'postgres');
if (!fs.existsSync(path.join(cluster, 'PG_VERSION'))) {
  const pw = path.join(dir, 'postgres-password');
  fs.writeFileSync(pw, config.password, { mode: 0o600 });
  run('initdb', ['-D', cluster, '-U', 'saas_staging', '--auth=scram-sha-256', '--encoding=UTF8', '--locale=C', '--pwfile', pw]);
}
const status = spawnSync(exe('pg_ctl'), ['-D', cluster, 'status'], { windowsHide: true });
if (status.status !== 0) run('pg_ctl', ['-D', cluster, '-l', path.join(dir, 'postgres.log'), '-o', `-h 127.0.0.1 -p ${config.port}`, '-w', 'start']);
const base = `postgresql://saas_staging:${config.password}@127.0.0.1:${config.port}/`;
const client = new pg.Client({ connectionString: base + 'postgres' });
await client.connect();
for (const name of ['quanlihocau_staging_saas', 'quanlihocau_staging_restore']) {
  if (!(await client.query('SELECT 1 FROM pg_database WHERE datname=$1', [name])).rowCount) {
    await client.query(`CREATE DATABASE "${name}"`);
  }
}
await client.end();
const env = { ...isolatedEnvironment(root),
  DATABASE_URL: base + 'quanlihocau_staging_saas', TEST_DATABASE_URL: base + 'quanlihocau_staging_saas',
  STAGING_RESTORE_URL: base + 'quanlihocau_staging_restore',
  NEXTAUTH_URL: 'http://127.0.0.1:3102', NEXT_PUBLIC_APP_URL: 'http://127.0.0.1:3102',
  TEST_BASE_URL: 'http://127.0.0.1:3102', NEXTAUTH_SECRET: config.secret, SESSION_SECRET: config.secret,
  AUTH_SECRET: config.secret, BANK_WEBHOOK_SECRET: config.webhook, CRON_SECRET: config.webhook,
  SAAS_TEST_ISOLATED: '1', PG_BIN: bin,
};
fs.writeFileSync(path.join(dir, 'env.json'), JSON.stringify(env), { mode: 0o600 });
console.log('Separate local staging and restore databases ready on loopback port 55433. Credentials retained only in ignored .staging directory. No production connection.');
