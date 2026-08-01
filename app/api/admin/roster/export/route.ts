import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/apiAuth";
import { buildRosterExport } from "@/lib/rosterExport";

export async function GET() {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const buffer = await buildRosterExport(prisma);
  const filename = `roster-export-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
