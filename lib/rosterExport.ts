import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";
import { ROSTER_EXPORT_HEADERS, formatBirthday } from "./rosterImport";

/**
 * Builds a roster spreadsheet of every family/child, in the same column
 * layout importRosterWorkbook() reads - so an export can be edited and
 * re-imported.
 */
export async function buildRosterExport(prisma: PrismaClient): Promise<Buffer> {
  const families = await prisma.family.findMany({
    include: { children: { include: { defaultVan: true } } },
    orderBy: { parentName: "asc" },
  });

  const rows: (string | number)[][] = [ROSTER_EXPORT_HEADERS];

  for (const family of families) {
    const address = family.addressLine2 ? `${family.address} ${family.addressLine2}` : family.address;
    for (const child of family.children) {
      rows.push([
        child.childName,
        address,
        child.birthday ? formatBirthday(child.birthday) : "",
        child.age ?? "",
        child.medicalNotes ?? "",
        family.parentName,
        family.phone,
        family.email ?? "",
        family.emergencyContactName ?? "",
        family.emergencyContactPhone ?? "",
        family.emergencyContactRelationship ?? "",
        child.bestContactPhone ?? "",
        child.pickupRequired ? "Yes" : "No",
        child.defaultVan?.vanName ?? "None",
      ]);
    }
  }

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Roster");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
