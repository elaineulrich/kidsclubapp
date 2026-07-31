-- AlterTable
ALTER TABLE "Child" ADD COLUMN     "bestContactPhone" TEXT;

-- AlterTable
ALTER TABLE "Family" ADD COLUMN     "emergencyContactName" TEXT,
ADD COLUMN     "emergencyContactPhone" TEXT,
ADD COLUMN     "emergencyContactRelationship" TEXT;

-- Preserve existing free-text emergency contact data by copying it into the new
-- name field, rather than discarding it - admins can split it into the structured
-- fields via the edit form afterward.
UPDATE "Family" SET "emergencyContactName" = "emergencyContact" WHERE "emergencyContact" IS NOT NULL;

ALTER TABLE "Family" DROP COLUMN "emergencyContact";
