import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/apiAuth";

export async function GET() {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const families = await prisma.family.findMany({
    include: { children: true },
    orderBy: { parentName: "asc" },
  });

  return NextResponse.json(families);
}
