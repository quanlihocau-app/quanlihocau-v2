require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "ApprovalRequest" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "lakeId" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "requestedBy" TEXT NOT NULL,
      "requestedByName" TEXT,
      "note" TEXT NOT NULL,
      "payload" TEXT NOT NULL,
      "reviewedBy" TEXT,
      "reviewedAt" TIMESTAMP(3),
      "reviewNote" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "ApprovalRequest_lakeId_status_idx" ON "ApprovalRequest"("lakeId", "status");
    CREATE INDEX IF NOT EXISTS "ApprovalRequest_lakeId_createdAt_idx" ON "ApprovalRequest"("lakeId", "createdAt");
  `);
  console.log("ApprovalRequest table created successfully in Postgres");
}

main()
  .catch(console.error)
  .finally(() => pool.end());

