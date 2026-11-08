import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import pg from 'pg';

assert.equal(process.env.SAAS_TEST_ISOLATED, '1');
const source = new URL(process.env.DATABASE_URL);
assert.ok(['127.0.0.1','localhost'].includes(source.hostname));
assert.match(source.pathname,/^\/quanlihocau_(staging_saas|ci)$/);
const output = path.resolve('.staging/recovery'); fs.mkdirSync(output,{recursive:true});
const id = crypto.randomBytes(6).toString('hex');
const adminUrl = new URL(source); adminUrl.pathname='/postgres';
const admin = new pg.Client({connectionString:adminUrl.href}); await admin.connect();
const newDb = async (prefix) => {
  const name=`quanlihocau_staging_${prefix}_${id}`;
  await admin.query(`CREATE DATABASE "${name}"`);
  const url=new URL(source);url.pathname='/'+name;
  const client=new pg.Client({connectionString:url.href});await client.connect();return {client,url};
};
async function snapshot(client) {
  const names=(await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows.map(r=>r.tablename);
  const result={};
  for(const name of names) {
    const quoted='"'+name.replaceAll('"','""')+'"';
    result[name]=(await client.query(`SELECT count(*)::int n, md5(COALESCE(string_agg(row_to_json(t)::text, E'\\n' ORDER BY row_to_json(t)::text),'')) checksum FROM ${quoted} t`)).rows[0];
  }
  return result;
}
const upgrade=await newDb('upgrade');
const migrations=fs.readdirSync('prisma/migrations').filter(n=>fs.existsSync(`prisma/migrations/${n}/migration.sql`)).sort();
const added=migrations.filter(n=>n.startsWith('20261104'));
try {
  for(const name of migrations.filter(n=>!added.includes(n))) await upgrade.client.query(fs.readFileSync(`prisma/migrations/${name}/migration.sql`,'utf8'));
  const org=crypto.randomUUID(), lake=crypto.randomUUID(), user=crypto.randomUUID();
  await upgrade.client.query('INSERT INTO "Organization" (id,name,"updatedAt") VALUES ($1,\'Preserve org\',NOW())',[org]);
  await upgrade.client.query('INSERT INTO "Lake" (id,"organizationId",name,"updatedAt") VALUES ($1,$2,\'Preserve lake\',NOW())',[lake,org]);
  await upgrade.client.query('INSERT INTO "User" (id,email,name,"updatedAt") VALUES ($1,$2,\'Preserve owner\',NOW())',[user,`upgrade-${id}@example.test`]);
  await upgrade.client.query('INSERT INTO "Membership" (id,"userId","lakeId",role,"updatedAt") VALUES ($1,$2,$3,\'OWNER\',NOW())',[crypto.randomUUID(),user,lake]);
  await upgrade.client.query('CREATE UNIQUE INDEX "Membership_lakeId_role_key" ON "Membership"("lakeId",role)');
  const invoice=crypto.randomUUID();
  await upgrade.client.query('INSERT INTO "Invoice" (id,"lakeId",status,"totalAmountVnd","paidAmountVnd","updatedAt") VALUES ($1,$2,\'PAID\',123456,123456,NOW())',[invoice,lake]);
  await upgrade.client.query('INSERT INTO "Payment" (id,"lakeId","invoiceId","amountVnd",method,direction) VALUES ($1,$2,$3,123456,\'CASH\',\'IN\')',[crypto.randomUUID(),lake,invoice]);
  await upgrade.client.query('INSERT INTO "SubscriptionPlan" (id,code,name,"priceVnd","durationDays","updatedAt") VALUES ($1,\'SILVER\',\'Preserve custom catalog\',119000,31,NOW())',[`preserve-plan-${id}`]);
  const catalogBefore=(await upgrade.client.query('SELECT row_to_json(t) row FROM "SubscriptionPlan" t ORDER BY id')).rows;
  const before=await snapshot(upgrade.client);
  for(const name of added) await upgrade.client.query(fs.readFileSync(`prisma/migrations/${name}/migration.sql`,'utf8'));
  const after=await snapshot(upgrade.client);
  assert.deepEqual((await upgrade.client.query('SELECT row_to_json(t) row FROM "SubscriptionPlan" t WHERE id=$1',[`preserve-plan-${id}`])).rows,catalogBefore);
  for(const name of Object.keys(before).filter(n=>n!=='SubscriptionPlan')) assert.deepEqual(after[name],before[name],`Upgrade must preserve ${name}`);
  // Reapplying only the additive SQL must preserve catalog and existing rows too.
  for(const name of added) await upgrade.client.query(fs.readFileSync(`prisma/migrations/${name}/migration.sql`,'utf8'));
  assert.deepEqual(await snapshot(upgrade.client),after);
  const extra=crypto.randomUUID();
  await upgrade.client.query('INSERT INTO "User" (id,email,name,"updatedAt") VALUES ($1,$2,\'Second owner attempt\',NOW())',[extra,`extra-${id}@example.test`]);
  await assert.rejects(upgrade.client.query('INSERT INTO "Membership" (id,"userId","lakeId",role,"updatedAt") VALUES ($1,$2,$3,\'OWNER\',NOW())',[crypto.randomUUID(),extra,lake]),{code:'23505'});
  await upgrade.client.query('DROP INDEX "Membership_active_owner_key"');
  await upgrade.client.query('INSERT INTO "Membership" (id,"userId","lakeId",role,"updatedAt") VALUES ($1,$2,$3,\'OWNER\',NOW())',[crypto.randomUUID(),extra,lake]);
  const duplicateBefore=await snapshot(upgrade.client);
  await assert.rejects(upgrade.client.query(fs.readFileSync('prisma/migrations/20261104120000_membership_active_owner/migration.sql','utf8')),{code:'P0001'});
  await upgrade.client.query('ROLLBACK');
  assert.deepEqual(await snapshot(upgrade.client),duplicateBefore,'Preflight failure must leave every row untouched');
  const restore=await newDb('restore');
  await restore.client.end();
  const bin=process.env.PG_BIN;
  const exe=(name)=>bin?path.join(bin,name+(process.platform==='win32'?'.exe':'')):name;
  const pgEnv=(url)=>({...process.env,PGHOST:url.hostname,PGPORT:url.port||'5432',PGUSER:decodeURIComponent(url.username),PGPASSWORD:decodeURIComponent(url.password),PGDATABASE:url.pathname.slice(1)});
  const run=(name,args,url)=>{const r=spawnSync(exe(name),args,{env:pgEnv(url),encoding:'utf8',windowsHide:true});if(r.status!==0)throw new Error(`${name} failed: ${r.stderr||r.error}`);};
  const sourceClient=new pg.Client({connectionString:source.href});await sourceClient.connect();
  try {
    // No app writes during this drill: close test runner before taking the snapshot.
    const expected=await snapshot(sourceClient);
    const dump=path.join(output,`snapshot-${id}.dump`);
    run('pg_dump',['--format=custom','--no-owner','--no-privileges','--file',dump],source);
    run('pg_restore',['--no-owner','--no-privileges','--exit-on-error','--dbname',restore.url.pathname.slice(1),dump],restore.url);
    const restored=new pg.Client({connectionString:restore.url.href});await restored.connect();
    try {assert.deepEqual(await snapshot(restored),expected,'Every table count and full-row checksum must match');}
    finally {await restored.end();}
    const report={checkedAt:new Date().toISOString(),upgradePreservesExistingRows:true,idempotentMigration:true,duplicateActiveOwnerRejected:true,duplicateOwnerPreflightPreservesRows:true,existingCatalogPreserved:true,restoreAllTableChecksumsMatch:true,tables:Object.keys(expected).length,source:'isolated local PostgreSQL',productionTouched:false};
    fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
  } finally {await sourceClient.end();}
} finally {await upgrade.client.end();await admin.end();}
