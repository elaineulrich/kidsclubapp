-- CreateTable
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "timezone" TEXT NOT NULL DEFAULT 'America/Chicago',

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);
