import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";

// Maps a normalized column header to the field we read it into. Tolerant of
// the exact punctuation/casing spreadsheet exports tend to vary (curly vs
// straight apostrophes, "Child's" vs "Childs", etc.) via normalizeHeader().
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

const REQUIRED_FIELDS = ["childName", "address", "parentName"];

export const ROSTER_EXPORT_HEADERS = [
  "Name",
  "Address",
  "Child's Birthdate",
  "Child's Age",
  "Child's Allergy Info",
  "Parent-Guardian Name",
  "Parent-Guardian Phone Number",
  "Parent-Guardian Email",
  "Emergency Contact",
  "Emergency Phone Number",
  "Emergency Contact Relationship",
  "Best Number to Contact during kids club",
  "Need Transportation",
  "Route",
];

export interface RosterImportResult {
  familiesCreated: number;
  familiesReused: number;
  childrenCreated: number;
  childrenSkipped: number;
  warnings: string[];
}

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

export function parseBirthday(raw: string): Date | null {
  const match = raw.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!match) return null;
  const [, month, day, year] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatBirthday(date: Date): string {
  return `${date.getMonth() + 1}-${date.getDate()}-${date.getFullYear()}`;
}

/**
 * Parses a roster spreadsheet (Haven Kids Club "Profile Metrics" export
 * format, or the output of buildRosterExport) and creates Family/Child
 * records. Groups rows by address into families. Safe to re-run: existing
 * families are matched by address and existing children are matched by name
 * within that family, so nothing is duplicated.
 */
export async function importRosterWorkbook(
  prisma: PrismaClient,
  fileBuffer: Buffer
): Promise<RosterImportResult> {
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  const sheetName = workbook.SheetNames.includes("Profile Metrics")
    ? "Profile Metrics"
    : workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" });

  if (rows.length === 0) {
    throw new Error(`Sheet "${sheetName}" is empty.`);
  }

  const headerRow = rows[0].map((h) => normalizeHeader(cellToText(h)));
  const colIndex: Record<string, number> = {};
  headerRow.forEach((normalized, i) => {
    const field = HEADER_MAP[normalized];
    if (field) colIndex[field] = i;
  });

  for (const required of REQUIRED_FIELDS) {
    if (!(required in colIndex)) {
      throw new Error(
        `Could not find a "${required}" column in the sheet header. Found headers: ${rows[0].join(", ")}`
      );
    }
  }

  const get = (row: unknown[], field: string) =>
    field in colIndex ? cellToText(row[colIndex[field]]) : "";

  const vans = await prisma.van.findMany();
  const vanByName = new Map(vans.map((v) => [v.vanName.trim().toLowerCase(), v.id]));

  const result: RosterImportResult = {
    familiesCreated: 0,
    familiesReused: 0,
    childrenCreated: 0,
    childrenSkipped: 0,
    warnings: [],
  };

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
      result.familiesReused++;
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
      result.familiesCreated++;
    }

    for (const row of familyRows) {
      const childName = get(row, "childName");

      const existing = await prisma.child.findFirst({
        where: { familyId: family.id, childName },
      });
      if (existing) {
        result.childrenSkipped++;
        continue;
      }

      const birthdayRaw = get(row, "birthday");
      const birthday = birthdayRaw ? parseBirthday(birthdayRaw) : null;
      if (birthdayRaw && !birthday) {
        result.warnings.push(`${childName}: couldn't parse birthdate "${birthdayRaw}", left blank`);
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
          result.warnings.push(`${childName}: no Van named "${routeRaw}" found, left unassigned`);
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
      result.childrenCreated++;
    }
  }

  return result;
}
