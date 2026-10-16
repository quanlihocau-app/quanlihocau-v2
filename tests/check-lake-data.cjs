/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  // Check ALL memberships for huant5300 (including deleted)
  const r1 = await pool.query(
    `SELECT m.id, m."userId", m."lakeId", m.role, m."deletedAt", m."createdAt",
            l.name as lname, l."deletedAt" as lake_deleted
     FROM "Membership" m
     JOIN "Lake" l ON m."lakeId" = l.id
     WHERE m."userId" = $1
     ORDER BY m."createdAt"`,
    ['af92ee2c-9544-43ae-bdb5-e1800bc44b3d']  // huant5300@gmail.com userId
  );
  console.log('=== ALL memberships for huant5300@gmail.com ===');
  r1.rows.forEach(m => console.log(JSON.stringify(m)));

  // Check ALL memberships for hienql@hocau.com
  const r2 = await pool.query(
    `SELECT m.id, m."userId", m."lakeId", m.role, m."deletedAt", m."createdAt",
            l.name as lname, l."deletedAt" as lake_deleted
     FROM "Membership" m
     JOIN "Lake" l ON m."lakeId" = l.id
     WHERE m."userId" = $1
     ORDER BY m."createdAt"`,
    ['47b8a6f0-3587-4026-8ec7-f8270b520ee6']  // hienql@hocau.com userId
  );
  console.log('\n=== ALL memberships for hienql@hocau.com ===');
  r2.rows.forEach(m => console.log(JSON.stringify(m)));

  // Check if huant5300 has a membership in the OLD lake too
  const r3 = await pool.query(
    `SELECT m.id, m."userId", m."lakeId", m.role, m."deletedAt", m."createdAt",
            u.email, l.name as lname
     FROM "Membership" m
     JOIN "User" u ON m."userId" = u.id
     JOIN "Lake" l ON m."lakeId" = l.id
     WHERE m."lakeId" = $1
     ORDER BY m."createdAt"`,
    ['38bb61e7-1fce-4b57-a0cf-ae3adcf415a4']  // "hồ câu Kim Thông" (old lake)
  );
  console.log('\n=== All memberships on OLD lake "hồ câu Kim Thông" ===');
  r3.rows.forEach(m => console.log(JSON.stringify(m)));
  
  // Check memberships on NEW lake "Kim Thông"
  const r4 = await pool.query(
    `SELECT m.id, m."userId", m."lakeId", m.role, m."deletedAt", m."createdAt",
            u.email, l.name as lname
     FROM "Membership" m
     JOIN "User" u ON m."userId" = u.id
     JOIN "Lake" l ON m."lakeId" = l.id
     WHERE m."lakeId" = $1
     ORDER BY m."createdAt"`,
    ['e15a3e90-7c6c-4f48-be29-011843f6ab1e']  // "Kim Thông" (new lake)
  );
  console.log('\n=== All memberships on NEW lake "Kim Thông" ===');
  r4.rows.forEach(m => console.log(JSON.stringify(m)));

  // Count sessions/records on each lake
  const tables = ['FishingSession', 'Invoice', 'Payment', 'Service'];
  for (const table of tables) {
    try {
      const r = await pool.query(
        `SELECT "lakeId", COUNT(*) as cnt FROM "${table}" WHERE "lakeId" IN ($1, $2) GROUP BY "lakeId"`,
        ['38bb61e7-1fce-4b57-a0cf-ae3adcf415a4', 'e15a3e90-7c6c-4f48-be29-011843f6ab1e']
      );
      console.log(`\n=== ${table} counts by lake ===`);
      r.rows.forEach(row => console.log(JSON.stringify(row)));
    } catch(e) {
      console.log(`\n=== ${table}: table not found or error ===`);
    }
  }

  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
