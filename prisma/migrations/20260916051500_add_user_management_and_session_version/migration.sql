-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "lockedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "lockedReason" TEXT,
ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "sessionVersion" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "AuditEvent" ALTER COLUMN "lakeId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuditEvent_createdAt_idx" ON "AuditEvent"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuditEvent_entityType_entityId_idx" ON "AuditEvent"("entityType", "entityId");
