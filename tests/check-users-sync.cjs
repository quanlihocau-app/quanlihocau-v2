/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  try {
    const usersResult = await pool.query(
      'SELECT id, email, name, "systemRole", "isLocked", phone FROM "User" WHERE email ILIKE $1 OR email ILIKE $2 OR email ILIKE $3 ORDER BY email',
      ['%huan%', '%hien%', '%huant5300%']
    );
    
    console.log('=== USERS matching huan/hien ===');
    usersResult.rows.forEach(u => console.log(JSON.stringify(u)));
    
    const userIds = usersResult.rows.map(u => u.id);
    
    if (userIds.length > 0) {
      const memberships = await pool.query(
        'SELECT m.id, m."userId", m."lakeId", m.role, m."deletedAt", u.email, u.name as uname, l.name as lname FROM "Membership" m JOIN "User" u ON m."userId" = u.id JOIN "Lake" l ON m."lakeId" = l.id WHERE m."userId" = ANY($1) ORDER BY u.email',
        [userIds]
      );
      console.log('\n=== MEMBERSHIPS for these users ===');
      memberships.rows.forEach(m => console.log(JSON.stringify(m)));
    }

    const lakes = await pool.query(
      'SELECT l.id, l.name, o.name as oname, l."deletedAt" FROM "Lake" l JOIN "Organization" o ON l."organizationId" = o.id ORDER BY l."createdAt"'
    );
    console.log('\n=== ALL LAKES ===');
    lakes.rows.forEach(l => console.log(JSON.stringify(l)));

    const allMemberships = await pool.query(
      'SELECT m."userId", m."lakeId", m.role, m."deletedAt", u.email, l.name as lname FROM "Membership" m JOIN "User" u ON m."userId" = u.id JOIN "Lake" l ON m."lakeId" = l.id WHERE m."deletedAt" IS NULL ORDER BY l.name, m.role'
    );
    console.log('\n=== ALL ACTIVE MEMBERSHIPS ===');
    allMemberships.rows.forEach(m => console.log(JSON.stringify(m)));

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

main();
