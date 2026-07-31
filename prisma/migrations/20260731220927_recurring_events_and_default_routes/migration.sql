-- CreateEnum
CREATE TYPE "Recurrence" AS ENUM ('NONE', 'WEEKLY', 'BIWEEKLY');

-- AlterTable
ALTER TABLE "Child" ADD COLUMN     "defaultVanId" TEXT;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "recurrence" "Recurrence" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "routesConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "seriesId" TEXT;

-- CreateIndex
CREATE INDEX "Event_seriesId_idx" ON "Event"("seriesId");

-- AddForeignKey
ALTER TABLE "Child" ADD CONSTRAINT "Child_defaultVanId_fkey" FOREIGN KEY ("defaultVanId") REFERENCES "Van"("id") ON DELETE SET NULL ON UPDATE CASCADE;
