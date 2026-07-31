import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/apiAuth";

export async function GET(req: NextRequest) {
  const { error } = await requireRole(["ADMIN", "VOLUNTEER"]);
  if (error) return error;

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const eventId = req.nextUrl.searchParams.get("eventId");

  if (!q) return NextResponse.json([]);

  const children = await prisma.child.findMany({
    where: {
      activeStatus: true,
      OR: [
        { childName: { contains: q, mode: "insensitive" } },
        { family: { parentName: { contains: q, mode: "insensitive" } } },
      ],
    },
    include: {
      family: true,
      attendances: eventId ? { where: { eventId } } : false,
    },
    orderBy: { childName: "asc" },
    take: 20,
  });

  const results = children.map((c) => ({
    id: c.id,
    childName: c.childName,
    age: c.age,
    medicalNotes: c.medicalNotes,
    parentName: c.family.parentName,
    parentPhone: c.family.phone,
    attendance: c.attendances?.[0] ?? null,
  }));

  return NextResponse.json(results);
}
