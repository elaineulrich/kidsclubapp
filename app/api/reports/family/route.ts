import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/apiAuth";
import { getOrSetCache } from "@/lib/redis";

export async function GET() {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const families = await getOrSetCache("report:family", 30, () =>
    prisma.family.findMany({
      include: { children: true },
      orderBy: { parentName: "asc" },
    })
  );

  return NextResponse.json(families);
}
