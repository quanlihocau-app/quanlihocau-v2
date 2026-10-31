import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client.js';

const p = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

try {
  const result = await p.$queryRaw`SELECT current_user, current_database()`;
  console.log('=== DB Connection OK ===');
  console.table(result);

  const tableOwners = await p.$queryRaw`
    SELECT tablename, tableowner 
    FROM pg_tables 
    WHERE schemaname='public' AND tablename IN ('Membership', 'Shift', 'User', 'Lake') 
    ORDER BY tablename
  `;
  console.log('\n=== Table Owners ===');
  console.table(tableOwners);

  const indexes = await p.$queryRaw`
    SELECT indexname FROM pg_indexes 
    WHERE schemaname='public' AND tablename='Membership'
  `;
  console.log('\n=== Membership Indexes ===');
  console.table(indexes);

} catch (e) {
  console.error('Error:', e.message);
} finally {
  await p.$disconnect();
}
