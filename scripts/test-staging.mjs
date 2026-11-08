import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
assert.equal(process.env.SAAS_TEST_ISOLATED, '1', 'Explicit isolated test environment required');
const db = new URL(process.env.DATABASE_URL);
assert.ok(['127.0.0.1', 'localhost'].includes(db.hostname), 'Refusing cloud/production database');
assert.match(db.pathname, /^\/quanlihocau_(staging_saas|ci)$/);
assert.ok(['127.0.0.1','localhost'].includes(new URL(process.env.TEST_BASE_URL).hostname));
const files = [
  'tests/saas-staging.integration.test.mjs',
  'tests/settlement-and-reporting.test.mjs',
  'tests/prepaid-and-postpaid-billing.test.mjs',
  'tests/finance-flow.integration.test.mjs',
  'tests/admin-manual-order-confirm.test.mjs',
];
const child = spawn(process.execPath, ['--test','--test-concurrency=1','--test-timeout=240000',...files], {
  env: { ...process.env, RUN_FINANCE_INTEGRATION: '1' }, stdio: 'inherit', windowsHide: true,
});
child.on('exit', (code) => { process.exitCode = code ?? 1; });
