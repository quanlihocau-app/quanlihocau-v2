-- Note: ALTER TABLE/DROP TABLE skipped (user qhc_app_20261014 is not table owner; owner is neondb_owner)

-- CreateTable: Notification (new table, user has CREATE privilege)
CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL,
    "lakeId" TEXT,
    "fromUserId" TEXT,
    "toUserId" TEXT,
    "title" TEXT,
    "body" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey for Notification
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Notification_lakeId_fkey') THEN
    ALTER TABLE "Notification" ADD CONSTRAINT "Notification_lakeId_fkey"
      FOREIGN KEY ("lakeId") REFERENCES "Lake"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Notification_fromUserId_fkey') THEN
    ALTER TABLE "Notification" ADD CONSTRAINT "Notification_fromUserId_fkey"
      FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Notification_toUserId_fkey') THEN
    ALTER TABLE "Notification" ADD CONSTRAINT "Notification_toUserId_fkey"
      FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- NOTE: Unique index Membership_lakeId_role_key must be created by neondb_owner.
-- Run manually: CREATE UNIQUE INDEX "Membership_lakeId_role_key" ON "Membership"("lakeId", "role");
