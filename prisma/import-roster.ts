/**
 * CLI entry point for importing a roster spreadsheet outside the admin UI
 * (e.g. a one-off bulk load before the app is deployed, or from a machine
 * with direct database access).
 *
 * Usage:
 *   npx tsx prisma/import-roster.ts /path/to/roster.xlsx
 *
 * The admin UI at /admin/import-export offers the same import (and an
 * export) without needing shell/DB access - prefer that day to day.
 */
import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";
import { importRosterWorkbook } from "@/lib/rosterImport";

const prisma = new PrismaClient();

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: npx tsx prisma/import-roster.ts /path/to/roster.xlsx");
    process.exit(1);
  }

  const buffer = readFileSync(filePath);
  const result = await importRosterWorkbook(prisma, buffer);

  console.log(`Families created: ${result.familiesCreated}`);
  console.log(`Families already existing (matched by address, reused): ${result.familiesReused}`);
  console.log(`Children created: ${result.childrenCreated}`);
  console.log(`Children skipped (already existed): ${result.childrenSkipped}`);
  if (result.warnings.length) {
    console.log(`\nWarnings (${result.warnings.length}):`);
    result.warnings.forEach((w) => console.log(`  - ${w}`));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
