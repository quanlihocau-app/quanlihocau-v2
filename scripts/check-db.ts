import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const p = new PrismaClient({ adapter } as any);

async function main() {
  const result = await p.$queryRaw`SELECT current_user as u, current_database() as db`;
  console.log("✅ DB Connection OK:", result);

  const owners = await p.$queryRaw`
    SELECT tablename, tableowner 
    FROM pg_tables 
    WHERE schemaname='public' AND tablename IN ('Membership','Shift','User','Lake') 
    ORDER BY tablename
  `;
  console.log("\n📋 Table Owners:");
  console.table(owners);

  const idx = await p.$queryRaw`
    SELECT indexname FROM pg_indexes 
    WHERE schemaname='public' AND tablename='Membership'
  `;
  console.log("\n🔑 Membership Indexes:");
  console.table(idx);
}

main()
  .catch(console.error)
  .finally(async () => { await p.$disconnect(); await pool.end(); });
