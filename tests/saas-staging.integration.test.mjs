import assert from 'node:assert/strict';
import test, { before, after } from 'node:test';
import crypto from 'node:crypto';
import pg from 'pg';
import bcrypt from 'bcryptjs';

// Never load .env: the runner must explicitly provide an isolated target.
assert.equal(process.env.SAAS_TEST_ISOLATED, '1', 'Use the isolated staging runner');
const db = new URL(process.env.DATABASE_URL);
assert.ok(['127.0.0.1', 'localhost'].includes(db.hostname));
assert.match(db.pathname, /^\/quanlihocau_(staging_saas|ci)$/);
const base = process.env.TEST_BASE_URL;
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(base).hostname));
pg.types.setTypeParser(1114, (str) => new Date(str + 'Z'));
const pool = new pg.Pool({ connectionString: db.href, max: 5 });
const password = 'StagingOnlyPassword123!';
const run = crypto.randomUUID().replaceAll('-', '').slice(0, 12);
const day = 86400000;
let a, b, adminCookie;

async function api(path, cookie, method = 'GET', body, headers = {}) {
  const res = await fetch(base + path, {
    method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...headers },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000),
  });
  return { status: res.status, data: await res.json() };
}
async function login(identifier, pass = password) {
  const csrf = await fetch(base + '/api/auth/csrf');
  const { csrfToken } = await csrf.json();
  const cookie = csrf.headers.getSetCookie().map((s) => s.split(';')[0]).join('; ');
  const res = await fetch(base + '/api/auth/callback/credentials', {
    method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ csrfToken, email: identifier, password: pass, json: 'true', redirect: 'false' }),
    redirect: 'manual', signal: AbortSignal.timeout(15000),
  });
  return res.headers.getSetCookie().filter((s) => s.includes('session-token=') && !s.includes('Max-Age=0')).map((s) => s.split(';')[0]).join('; ');
}
async function register(suffix) {
  const email = `saas-${run}-${suffix}@example.test`;
  const phone = `09${crypto.randomInt(10000000, 99999999)}`;
  const res = await api('/api/register', null, 'POST', { fullName: 'Staging owner', email, phone, password, lakeName: `SaaS staging ${run} ${suffix}` });
  assert.equal(res.status, 201, JSON.stringify(res.data));
  const user = (await pool.query('SELECT * FROM "User" WHERE email=$1', [email])).rows[0];
  const membership = (await pool.query('SELECT * FROM "Membership" WHERE "userId"=$1', [user.id])).rows[0];
  const lake = (await pool.query('SELECT * FROM "Lake" WHERE id=$1', [membership.lakeId])).rows[0];
  const cookie = await login(phone);
  assert.ok(cookie, 'Phone/password login issues a session');
  return { user, lake, cookie, email };
}
const member = (suffix) => ({ name: 'Staging staff', email: `staff-${run}-${suffix}`, password, role: 'STAFF' });
async function order() {
  const res = await api('/api/subscription/orders', a.cookie, 'POST', { plan: 'SILVER' });
  assert.equal(res.status, 201, JSON.stringify(res.data));
  return res.data.order;
}
async function webhook(o, extra = {}) {
  return api('/api/webhooks/bank', null, 'POST', { content: `HOCAU ${o.orderCode}`, transferAmount: o.amountVnd, referenceCode: `STAGING-${o.id}`, ...extra }, { 'x-api-key': process.env.BANK_WEBHOOK_SECRET });
}

before(async () => {
  a = await register('a'); b = await register('b');
  const email = `saas-admin-${run}@example.test`;
  await pool.query('INSERT INTO "User" (id,email,name,"passwordHash","systemRole","updatedAt") VALUES ($1,$2,$3,$4,\'SUPER_ADMIN\',NOW())',
    [crypto.randomUUID(), email, 'Staging admin', await bcrypt.hash(password, 10)]);
  adminCookie = await login(email);
  assert.ok(adminCookie);
});
after(async () => { await pool.end(); }); // Fixtures stay in staging for inspection; no cleanup of business data.

test('onboarding creates trial, sample data and unverified phone atomically', async () => {
  assert.equal(a.user.phoneVerified, false);
  assert.equal(a.lake.subscriptionStatus, 'TRIAL');
  assert.ok(new Date(a.lake.subscriptionExpiresAt).getTime() > Date.now() + 29 * day);
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM "Hut" WHERE "lakeId"=$1', [a.lake.id])).rows[0].n, 10);
  assert.equal((await api('/api/me', a.cookie)).status, 200);
  assert.ok(await login(a.email), 'Email/password also works');
  assert.equal(await login(a.email, 'IncorrectPassword!'), '');
});

test('sample seed failure rolls back account, membership, lake and organization on PostgreSQL', async () => {
  const marker = `rollback-${run}`;
  const fn = `saas_seed_failure_${run}`;
  const counts = async () => (await pool.query('SELECT (SELECT count(*) FROM "User") users, (SELECT count(*) FROM "Lake") lakes, (SELECT count(*) FROM "Organization") orgs, (SELECT count(*) FROM "Membership") members')).rows[0];
  const before = await counts();
  await pool.query(`CREATE FUNCTION ${fn}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF EXISTS(SELECT 1 FROM "Lake" WHERE id=NEW."lakeId" AND name='${marker}') THEN RAISE EXCEPTION 'synthetic staging seed failure'; END IF; RETURN NEW; END $$`);
  await pool.query(`CREATE TRIGGER ${fn} BEFORE INSERT ON "Hut" FOR EACH ROW EXECUTE FUNCTION ${fn}()`);
  try {
    const result = await api('/api/register',null,'POST',{fullName:'Rollback staging',email:`${marker}@example.test`,phone:`09${crypto.randomInt(10000000,99999999)}`,password,lakeName:marker});
    assert.equal(result.status,400);
    assert.deepEqual(await counts(),before);
  } finally {
    await pool.query(`DROP TRIGGER ${fn} ON "Hut"`);
    await pool.query(`DROP FUNCTION ${fn}()`);
  }
});

test('cannot take over another lake owner or reset a shared account', async () => {
  const before = (await pool.query('SELECT "passwordHash","sessionVersion","isLocked",name FROM "User" WHERE id=$1', [b.user.id])).rows[0];
  const attack = await api('/api/members', a.cookie, 'POST', { ...member('attack'), email: b.email });
  assert.equal(attack.status, 409);
  assert.deepEqual((await pool.query('SELECT "passwordHash","sessionVersion","isLocked",name FROM "User" WHERE id=$1', [b.user.id])).rows[0], before);
  const id = crypto.randomUUID();
  await pool.query('INSERT INTO "Membership" (id,"userId","lakeId",role,"updatedAt") VALUES ($1,$2,$3,\'STAFF\',NOW())', [id, b.user.id, a.lake.id]);
  assert.equal((await api(`/api/members/${id}`, a.cookie, 'PATCH', { action: 'RESET_PASSWORD', newPassword: 'AttackerPassword123!' })).status, 403);
  await pool.query('UPDATE "Membership" SET "deletedAt"=NOW() WHERE id=$1', [id]);
});

test('staff quota is atomic across members and legacy memberships endpoints', async () => {
  await pool.query('UPDATE "Lake" SET "subscriptionPlan"=\'SILVER\' WHERE id=$1', [a.lake.id]);
  const first = await api('/api/members', a.cookie, 'POST', member('first'));
  assert.equal(first.status, 201);
  const results = await Promise.all([
    api('/api/members', a.cookie, 'POST', member('second')),
    api('/api/memberships', a.cookie, 'POST', { ...member('third'), email: `legacy-${run}@example.test` }),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 403]);
  const count = (await pool.query('SELECT count(*)::int n FROM "Membership" WHERE "lakeId"=$1 AND role IN (\'STAFF\',\'MANAGER\') AND "deletedAt" IS NULL', [a.lake.id])).rows[0].n;
  assert.equal(count, 2);
  await pool.query('UPDATE "Lake" SET "subscriptionPlan"=\'GOLD\' WHERE id=$1', [a.lake.id]);
  assert.equal((await api('/api/members', a.cookie, 'POST', member('gold'))).status, 201, 'multiple active STAFF are allowed');
  assert.equal((await api('/api/members', b.cookie, 'POST', member('first'))).status, 409, 'global username cannot be reassigned by another lake');
});

test('deactivation preserves history and revokes sessions; reactivation is scoped', async () => {
  const email = `${member('first').email}@hocau.vn`;
  const staffCookie = await login(member('first').email);
  assert.ok(staffCookie);
  assert.equal((await api('/api/members', staffCookie)).status, 403);
  const m = (await pool.query('SELECT m.* FROM "Membership" m JOIN "User" u ON u.id=m."userId" WHERE u.email=$1', [email])).rows[0];
  assert.equal((await api(`/api/members/${m.id}`, b.cookie, 'PATCH', { action: 'DEACTIVATE' })).status, 404);
  assert.equal((await api(`/api/members/${m.id}`, a.cookie, 'PATCH', { action: 'DEACTIVATE' })).status, 200);
  assert.ok([401,403].includes((await api('/api/me', staffCookie)).status));
  assert.ok((await pool.query('SELECT "deletedAt" FROM "Membership" WHERE id=$1', [m.id])).rows[0].deletedAt);
  assert.equal((await api('/api/members', a.cookie, 'POST', member('first'))).status, 201);
  assert.ok([401,403].includes((await api('/api/me', staffCookie)).status), 'reactivating must not revive old cookies');
});

test('spot quota serializes both aliases and rejects foreign area IDs', async () => {
  const area = (await pool.query('SELECT id FROM "Area" WHERE "lakeId"=$1 LIMIT 1', [a.lake.id])).rows[0].id;
  const foreignArea = (await pool.query('SELECT id FROM "Area" WHERE "lakeId"=$1 LIMIT 1', [b.lake.id])).rows[0].id;
  for (let i=0;i<19;i++) await pool.query('INSERT INTO "Hut" (id,"lakeId","areaId",name,"updatedAt") VALUES ($1,$2,$3,$4,NOW())', [crypto.randomUUID(), a.lake.id, area, `quota fixture ${i}`]);
  await pool.query('UPDATE "Lake" SET "subscriptionPlan"=\'SILVER\' WHERE id=$1', [a.lake.id]);
  const results = await Promise.all(['/api/spots','/api/huts'].map((path) => api(path, a.cookie, 'POST', { name: 'Concurrent spot', areaId: area })));
  assert.deepEqual(results.map((r) => r.status).sort(), [201,403]);
  assert.equal((await pool.query('SELECT count(*)::int n FROM "Hut" WHERE "lakeId"=$1 AND "deletedAt" IS NULL', [a.lake.id])).rows[0].n,30);
  assert.equal((await api('/api/huts', b.cookie, 'POST', { name: 'Foreign area attack', areaId: area })).status,404);
  assert.equal((await api('/api/spots', a.cookie)).data.some((h) => h.areaId === foreignArea), false);
});

test('concurrent webhook retries activate one order once', async () => {
  const o = await order();
  const baseline = new Date('2030-01-01T00:00:00Z');
  await pool.query('UPDATE "Lake" SET "subscriptionExpiresAt"=$1 WHERE id=$2', [baseline.toISOString(), a.lake.id]);
  const results = await Promise.all(Array.from({ length: 8 }, () => webhook(o)));
  assert.ok(results.every((r) => r.status === 200), JSON.stringify(results));
  assert.equal(results.filter((r) => !r.data.data.idempotent).length,1);
  assert.equal((await pool.query('SELECT "subscriptionExpiresAt" FROM "Lake" WHERE id=$1',[a.lake.id])).rows[0].subscriptionExpiresAt.getTime(),baseline.getTime()+30*day);
  assert.equal((await pool.query('SELECT count(*)::int n FROM "AuditEvent" WHERE "entityId"=$1 AND action=\'PLAN_ACTIVATED\'',[o.id])).rows[0].n,1);
});

test('different orders and manual/webhook races accumulate without lost days', async () => {
  const orders = await Promise.all([order(),order(),order()]);
  const baseline = (await pool.query('SELECT "subscriptionExpiresAt" FROM "Lake" WHERE id=$1',[a.lake.id])).rows[0].subscriptionExpiresAt.getTime();
  const results = await Promise.all([
    ...orders.map((o) => webhook(o)),
    api(`/api/admin/orders/${orders[0].id}/confirm`,adminCookie,'POST',{ reason:'Staging reconciliation simulation', reconciliationMethod:'BANK_STATEMENT', bankRef:'STAGING-MANUAL-REF' }),
  ]);
  assert.ok(results.every((r) => [200,409].includes(r.status)),JSON.stringify(results));
  assert.equal((await pool.query('SELECT "subscriptionExpiresAt" FROM "Lake" WHERE id=$1',[a.lake.id])).rows[0].subscriptionExpiresAt.getTime(),baseline+90*day);
  assert.equal((await pool.query('SELECT count(*)::int n FROM "AuditEvent" WHERE "entityId"=$1 AND action IN (\'PLAN_ACTIVATED\',\'MANUAL_PAYMENT_CONFIRM\')',[orders[0].id])).rows[0].n,1);
});

test('unsigned, insufficient, cancelled and expired payments cannot activate', async () => {
  const o = await order();
  assert.equal((await api('/api/webhooks/bank', null, 'POST', { orderCode:o.orderCode, amount:o.amountVnd })).status,401);
  assert.equal((await webhook(o,{ transferAmount: o.amountVnd-1 })).status,400);
  for (const status of ['CANCELLED','EXPIRED']) {
    await pool.query('UPDATE "SubscriptionOrder" SET status=$1 WHERE id=$2',[status,o.id]);
    assert.equal((await webhook(o)).status,409);
  }
});

test('expired subscription blocks writes, allows renewal, authenticated cron updates lifecycle', async () => {
  assert.equal((await api('/api/health',null)).status,401);
  assert.equal((await api('/api/health',null,'GET',undefined,{ 'Authorization':`Bearer ${process.env.CRON_SECRET}` })).status,200);
  await pool.query('UPDATE "Lake" SET "subscriptionStatus"=\'ACTIVE\',"subscriptionExpiresAt"=NOW()-INTERVAL \'4 days\' WHERE id=$1',[a.lake.id]);
  assert.equal((await api('/api/members',a.cookie,'POST',member('expired'))).status,403);
  assert.equal((await api('/api/members',a.cookie)).status,200);
  assert.equal((await api('/api/cron/subscriptions',null)).status,401);
  assert.equal((await api('/api/cron/subscriptions',null,'GET',undefined,{ 'x-api-key':process.env.CRON_SECRET })).status,200);
  assert.equal((await pool.query('SELECT "subscriptionStatus" FROM "Lake" WHERE id=$1',[a.lake.id])).rows[0].subscriptionStatus,'SUSPENDED');
  const o=await order(); assert.equal((await webhook(o)).status,200);
  assert.equal((await pool.query('SELECT "subscriptionStatus" FROM "Lake" WHERE id=$1',[a.lake.id])).rows[0].subscriptionStatus,'ACTIVE');
});

test('print queue is tenant isolated and records simulated device failure', async () => {
  const created=await api('/api/print-jobs',a.cookie,'POST',{ jobType:'TEST',targetName:'Staging simulated printer',payload:{ text:'SYNTHETIC TEST - NO PHYSICAL PRINT' } });
  assert.equal(created.status,201,JSON.stringify(created.data));
  const id=created.data.job.id;
  assert.equal((await api('/api/print-jobs',b.cookie)).data.jobs.some((j)=>j.id===id),false);
  assert.equal((await api(`/api/print-jobs/${id}`,b.cookie,'PATCH',{ status:'FAILED',error:'foreign' })).status,404);
  assert.equal((await api(`/api/print-jobs/${id}`,a.cookie,'PATCH',{ status:'FAILED',error:'Simulated out of paper' })).status,200);
});
