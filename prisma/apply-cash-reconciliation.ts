// Script to apply schema changes via $executeRawUnsafe
// since the migration user lacks ALTER TABLE permissions on Neon.
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured");
}

const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Checking and applying schema changes for cash reconciliation...");

  // Check if columns already exist
  const shiftColumns = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'Shift' AND column_name = 'openingCashVnd'
  `;

  if (shiftColumns.length === 0) {
    console.log("Adding openingCashVnd to Shift...");
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Shift" ADD COLUMN "openingCashVnd" INTEGER NOT NULL DEFAULT 0`
    );
    console.log("✓ Added openingCashVnd");
  } else {
    console.log("✓ openingCashVnd already exists");
  }

  // ShiftClose columns
  const closeColumns = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'ShiftClose' AND column_name IN ('actualCashVnd', 'cashDifferenceVnd', 'differenceReason', 'receivedBy')
  `;
  const existingCols = new Set(closeColumns.map(c => c.column_name));

  if (!existingCols.has("actualCashVnd")) {
    console.log("Adding actualCashVnd to ShiftClose...");
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "ShiftClose" ADD COLUMN "actualCashVnd" INTEGER`
    );
    console.log("✓ Added actualCashVnd");
  } else {
    console.log("✓ actualCashVnd already exists");
  }

  if (!existingCols.has("cashDifferenceVnd")) {
    console.log("Adding cashDifferenceVnd to ShiftClose...");
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "ShiftClose" ADD COLUMN "cashDifferenceVnd" INTEGER NOT NULL DEFAULT 0`
    );
    console.log("✓ Added cashDifferenceVnd");
  } else {
    console.log("✓ cashDifferenceVnd already exists");
  }

  if (!existingCols.has("differenceReason")) {
    console.log("Adding differenceReason to ShiftClose...");
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "ShiftClose" ADD COLUMN "differenceReason" TEXT`
    );
    console.log("✓ Added differenceReason");
  } else {
    console.log("✓ differenceReason already exists");
  }

  if (!existingCols.has("receivedBy")) {
    console.log("Adding receivedBy to ShiftClose...");
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "ShiftClose" ADD COLUMN "receivedBy" TEXT`
    );
    console.log("✓ Added receivedBy");
  } else {
    console.log("✓ receivedBy already exists");
  }

  console.log("\nAll schema changes applied successfully!");
}

main()
  .catch((e) => {
    console.error("Error applying schema changes:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
