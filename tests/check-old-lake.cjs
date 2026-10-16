/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  // Check if old lake has any memberships at all (including deleted)
  const r1 = await pool.query(
    `SELECT m.id, m."userId", m."lakeId", m.role, m."deletedAt", u.email, l.name as lname
     FROM "Membership" m
     JOIN "User" u ON m."userId" = u.id
     JOIN "Lake" l ON m."lakeId" = l.id
     WHERE l.id = $1`,
    ['38bb61e7-1fce-4b57-a0cf-ae3adcf415a4']
  );
  console.log('=== OLD lake memberships (any state) ===');
  r1.rows.forEach(m => console.log(JSON.stringify(m)));

  // Check what login actions look like
  const r2 = await pool.query(
    `SELECT * FROM "Lake" WHERE id = $1`,
    ['38bb61e7-1fce-4b57-a0cf-ae3adcf415a4']
  );
  console.log('\n=== OLD lake details ===');
  r2.rows.forEach(l => console.log(JSON.stringify(l)));

  // Check sessions created by each user in Kim Thông
  const r3 = await pool.query(
    `SELECT "createdById", COUNT(*) as cnt, u.email
     FROM "FishingSession" fs
     JOIN "User" u ON fs."createdById" = u.id
     WHERE fs."lakeId" = $1
     GROUP BY "createdById", u.email
     ORDER BY cnt DESC`,
    ['e15a3e90-7c6c-4f48-be29-011843f6ab1e']
  );
  console.log('\n=== Sessions created by each user on Kim Thông lake ===');
  r3.rows.forEach(r => console.log(JSON.stringify(r)));

  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
