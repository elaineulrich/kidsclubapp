/**
 * One-time importer for Haven Kids Club "Profile Metrics" roster exports (.xlsx).
 *
 * Usage:
 *   npx tsx prisma/import-roster.ts /path/to/roster.xlsx
 *
 * Run this from wherever DATABASE_URL points at your real database (locally
 * with .env set, or via `railway run npx tsx prisma/import-roster.ts <file>`).
 *
 * Groups rows by address into families, then creates one Child per row.
 * City/state/zip aren't in this report format, so they're left blank -
 * fill them in later from the admin Families page if you need them.
 * Safe to re-run: existing families are matched by address and existing
 * children are matched by name within that family, so nothing is duplicated.
 */
import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";

const prisma = new PrismaClient();

// Maps a normalized column header to the field we read it into.
const HEADER_MAP: Record<string, string> = {
  "name": "childName",
  "address": "address",
  "childs birthdate": "birthday",
  "childs age": "age",
  "childs allergy info": "medicalNotes",
  "parent guardian name": "parentName",
  "parent guardian phone number": "parentPhone",
  "parent guardian email": "parentEmail",
  "emergency contact": "emergencyContactName",
  "emergency phone number": "emergencyContactPhone",
  "emergency contact relationship": "emergencyContactRelationship",
  "best number to contact during kids club": "bestContactPhone",
  "need transportation": "needTransportation",
  "route": "route",
};

function normalizeHeader(raw: string): string {
  return raw
    .replace(/[‘’]/g, "'")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function cellToText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function parseBirthday(raw: string): Date | null {
  const match = raw.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!match) return null;
  const [, month, day, year] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime()) ? null : date;
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: npx tsx prisma/import-roster.ts /path/to/roster.xlsx");
    process.exit(1);
  }

  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames.includes("Profile Metrics")
    ? "Profile Metrics"
    : workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" });

  if (rows.length === 0) {
    console.error(`Sheet "${sheetName}" is empty.`);
    process.exit(1);
  }

  const headerRow = rows[0].map((h) => normalizeHeader(cellToText(h)));
  const colIndex: Record<string, number> = {};
  headerRow.forEach((normalized, i) => {
    const field = HEADER_MAP[normalized];
    if (field) colIndex[field] = i;
  });

  for (const required of ["childName", "address", "parentName"]) {
    if (!(required in colIndex)) {
      console.error(
        `Could not find a "${required}" column in the sheet header. Found headers: ${rows[0].join(", ")}`
      );
      process.exit(1);
    }
  }

  const get = (row: unknown[], field: string) =>
    field in colIndex ? cellToText(row[colIndex[field]]) : "";

  const vans = await prisma.van.findMany();
  const vanByName = new Map(vans.map((v) => [v.vanName.trim().toLowerCase(), v.id]));

  let familiesCreated = 0;
  let familiesReused = 0;
  let childrenCreated = 0;
  let childrenSkipped = 0;
  const warnings: string[] = [];

  // Group data rows by address; stop at the first row with no name (the
  // report ends with a couple of blank rows followed by a summary line).
  const groups = new Map<string, { rows: unknown[][] }>();
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const childName = get(row, "childName");
    if (!childName) break;

    const address = get(row, "address");
    const key = address.toLowerCase();
    if (!groups.has(key)) groups.set(key, { rows: [] });
    groups.get(key)!.rows.push(row);
  }

  for (const { rows: familyRows } of groups.values()) {
    const first = familyRows[0];
    const address = get(first, "address");
    const parentName = get(first, "parentName");

    let family = await prisma.family.findFirst({ where: { address } });
    if (family) {
      familiesReused++;
    } else {
      family = await prisma.family.create({
        data: {
          parentName,
          phone: get(first, "parentPhone"),
          email: get(first, "parentEmail") || null,
          address,
          city: "",
          state: "",
          zip: "",
          emergencyContactName: get(first, "emergencyContactName") || null,
          emergencyContactPhone: get(first, "emergencyContactPhone") || null,
          emergencyContactRelationship: get(first, "emergencyContactRelationship") || null,
        },
      });
      familiesCreated++;
    }

    for (const row of familyRows) {
      const childName = get(row, "childName");

      const existing = await prisma.child.findFirst({
        where: { familyId: family.id, childName },
      });
      if (existing) {
        childrenSkipped++;
        continue;
      }

      const birthdayRaw = get(row, "birthday");
      const birthday = birthdayRaw ? parseBirthday(birthdayRaw) : null;
      if (birthdayRaw && !birthday) {
        warnings.push(`${childName}: couldn't parse birthdate "${birthdayRaw}", left blank`);
      }

      const ageRaw = get(row, "age");
      const age = ageRaw ? Number(ageRaw) : null;

      const medicalRaw = get(row, "medicalNotes");
      const medicalNotes = medicalRaw && medicalRaw.toLowerCase() !== "none" ? medicalRaw : null;

      const routeRaw = get(row, "route");
      let defaultVanId: string | null = null;
      if (routeRaw && routeRaw.toLowerCase() !== "none") {
        const vanId = vanByName.get(routeRaw.trim().toLowerCase());
        if (vanId) {
          defaultVanId = vanId;
        } else {
          warnings.push(`${childName}: no Van named "${routeRaw}" found, left unassigned`);
        }
      }

      await prisma.child.create({
        data: {
          familyId: family.id,
          childName,
          birthday,
          age: age !== null && !Number.isNaN(age) ? age : null,
          medicalNotes,
          pickupRequired: get(row, "needTransportation").toLowerCase() === "yes",
          bestContactPhone: get(row, "bestContactPhone") || null,
          defaultVanId,
        },
      });
      childrenCreated++;
    }
  }

  console.log(`Families created: ${familiesCreated}`);
  console.log(`Families already existing (matched by address, reused): ${familiesReused}`);
  console.log(`Children created: ${childrenCreated}`);
  console.log(`Children skipped (already existed): ${childrenSkipped}`);
  if (warnings.length) {
    console.log(`\nWarnings (${warnings.length}):`);
    warnings.forEach((w) => console.log(`  - ${w}`));
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
