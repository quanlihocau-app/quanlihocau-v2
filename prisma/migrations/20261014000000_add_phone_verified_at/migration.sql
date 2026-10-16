-- Keep the user model aligned with the optional phone verification timestamp.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phoneVerifiedAt" TIMESTAMP(3);
