-- Add the approval model missing from historical migrations; preserve existing rows.
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
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX IF NOT EXISTS "ApprovalRequest_lakeId_status_idx" ON "ApprovalRequest"("lakeId", "status");
CREATE INDEX IF NOT EXISTS "ApprovalRequest_lakeId_createdAt_idx" ON "ApprovalRequest"("lakeId", "createdAt");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ApprovalRequest_lakeId_fkey' AND conrelid = '"ApprovalRequest"'::regclass) THEN
    ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_lakeId_fkey"
      FOREIGN KEY ("lakeId") REFERENCES "Lake"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
