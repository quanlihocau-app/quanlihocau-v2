-- Preserve all memberships, users, business records and inactive history.
-- Fail without modifying data if existing owners require operator review.
BEGIN;
LOCK TABLE "Membership" IN SHARE ROW EXCLUSIVE MODE;
DO $$ BEGIN
  IF EXISTS (
    SELECT "lakeId" FROM "Membership"
    WHERE "role" = 'OWNER' AND "deletedAt" IS NULL
    GROUP BY "lakeId" HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Multiple active owners: review memberships; no data was modified';
  END IF;
END $$;
ALTER TABLE "Membership" DROP CONSTRAINT IF EXISTS "Membership_lakeId_role_key";
DROP INDEX IF EXISTS "Membership_lakeId_role_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Membership_active_owner_key"
  ON "Membership" ("lakeId") WHERE "role" = 'OWNER' AND "deletedAt" IS NULL;
CREATE INDEX IF NOT EXISTS "Membership_lakeId_role_deletedAt_idx"
  ON "Membership" ("lakeId", "role", "deletedAt");
COMMIT;
