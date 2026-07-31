-- AlterTable
ALTER TABLE "User" ADD COLUMN     "inviteTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "inviteTokenHash" TEXT,
ADD COLUMN     "passwordSetAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "User_inviteTokenHash_key" ON "User"("inviteTokenHash");

-- Existing accounts already have a real password set - back-fill so they don't
-- show up as a pending invite in the admin UI.
UPDATE "User" SET "passwordSetAt" = "createdDate" WHERE "passwordSetAt" IS NULL;

