import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/apiAuth";

export async function GET(req: NextRequest) {
  const { error } = await requireRole(["ADMIN", "VOLUNTEER"]);
  if (error) return error;

  const q = req.nextUrl.searchParams.get("q")?.trim();
  const activeOnly = req.nextUrl.searchParams.get("activeOnly") === "true";

  const children = await prisma.child.findMany({
    where: {
      ...(activeOnly ? { activeStatus: true } : {}),
      ...(q
        ? {
            OR: [
              { childName: { contains: q, mode: "insensitive" } },
              { family: { parentName: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: { family: true },
    orderBy: { childName: "asc" },
  });

  return NextResponse.json(children);
}

export async function POST(req: NextRequest) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const body = await req.json();
  const { familyId, childName, birthday, grade, medicalNotes, pickupRequired, pickupNotes, bestContactPhone } = body;

  if (!familyId || !childName) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const child = await prisma.child.create({
    data: {
      familyId,
      childName,
      birthday: birthday ? new Date(birthday) : null,
      grade,
      medicalNotes,
      pickupRequired: !!pickupRequired,
      pickupNotes,
      bestContactPhone,
    },
  });

  return NextResponse.json(child, { status: 201 });
}
