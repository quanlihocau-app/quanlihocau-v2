import { PrismaClient } from '../src/generated/prisma/index.js';

const p = new PrismaClient();

try {
  const tableOwners = await p.$queryRaw`
    SELECT tablename, tableowner 
    FROM pg_tables 
    WHERE schemaname='public' AND tablename IN ('Membership', 'Shift', 'User', 'Lake') 
    ORDER BY tablename
  `;
  console.log('Table owners:', JSON.stringify(tableOwners, null, 2));

  // Check if Membership_lakeId_role_key index already exists
  const indexes = await p.$queryRaw`
    SELECT indexname FROM pg_indexes 
    WHERE schemaname='public' AND tablename='Membership'
  `;
  console.log('Membership indexes:', JSON.stringify(indexes, null, 2));
  
} finally {
  await p.$disconnect();
}
