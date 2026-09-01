import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/apiAuth";

// Wraps a value in quotes only when it contains a character that would
// otherwise break CSV parsing - keeps the common case (no commas/quotes) readable.
function csvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET() {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const families = await prisma.family.findMany({
    select: { parentName: true, phone: true, email: true },
    orderBy: { parentName: "asc" },
  });

  const rows = [
    ["Parent Name", "Phone", "Email"],
    ...families.map((f) => [f.parentName, f.phone, f.email ?? ""]),
  ];
  const csv = rows.map((row) => row.map(csvField).join(",")).join("\r\n");

  const filename = `contacts-export-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
