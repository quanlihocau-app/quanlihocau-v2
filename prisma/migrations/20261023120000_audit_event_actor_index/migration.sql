-- Additive only. Existing AuditEvent rows are left untouched.
-- Suggested retention: keep about 90 days, then delete in a reviewed one-off
-- after selling hours. This migration does not install a cron or delete rows.

CREATE INDEX IF NOT EXISTS "AuditEvent_lakeId_createdBy_createdAt_idx"
ON "AuditEvent"("lakeId", "createdBy", "createdAt");

ALTER TABLE "Lake" ADD COLUMN IF NOT EXISTS "auditReadTokenHash" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Lake_auditReadTokenHash_key"
ON "Lake"("auditReadTokenHash");
