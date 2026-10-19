-- Add cash reconciliation fields for shift handover workflow.
-- All additions are idempotent and backward-compatible with existing data.

-- Shift: opening cash balance at the start of a shift
ALTER TABLE "Shift"
    ADD COLUMN IF NOT EXISTS "openingCashVnd" INTEGER NOT NULL DEFAULT 0;

-- ShiftClose: actual cash counted at handover
ALTER TABLE "ShiftClose"
    ADD COLUMN IF NOT EXISTS "actualCashVnd" INTEGER;

-- ShiftClose: difference between expected and actual cash
ALTER TABLE "ShiftClose"
    ADD COLUMN IF NOT EXISTS "cashDifferenceVnd" INTEGER NOT NULL DEFAULT 0;

-- ShiftClose: mandatory reason when there is a cash discrepancy
ALTER TABLE "ShiftClose"
    ADD COLUMN IF NOT EXISTS "differenceReason" TEXT;

-- ShiftClose: staff member who receives the handover
ALTER TABLE "ShiftClose"
    ADD COLUMN IF NOT EXISTS "receivedBy" TEXT;
