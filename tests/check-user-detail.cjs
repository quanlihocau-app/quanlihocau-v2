/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const r = await pool.query(
    `SELECT id, email, name, "systemRole", "isLocked", phone, "passwordHash" IS NOT NULL as has_password
     FROM "User" 
     WHERE email ILIKE $1 OR email ILIKE $2 OR email ILIKE $3 
     ORDER BY email`,
    ['%huan%', '%hien%', '%huant5300%']
  );
  r.rows.forEach(u => console.log(JSON.stringify(u)));
  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
