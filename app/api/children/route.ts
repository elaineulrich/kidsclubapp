import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/apiAuth";

export async function GET(req: NextRequest) {
  const { error } = await requireRole(["ADMIN", "VOLUNTEER"]);
  if (error) return error;

  const q = req.nextUrl.searchParams.get("q")?.trim();
  const activeOnly = req.nextUrl.searchParams.get("activeOnly") === "true";
  const familyId = req.nextUrl.searchParams.get("familyId")?.trim();
  const address = req.nextUrl.searchParams.get("address")?.trim();

  const children = await prisma.child.findMany({
    where: {
      ...(activeOnly ? { activeStatus: true } : {}),
      ...(familyId ? { familyId } : {}),
      ...(address ? { family: { address: { contains: address, mode: "insensitive" } } } : {}),
      ...(q
        ? {
            OR: [
              { childName: { contains: q, mode: "insensitive" } },
              { family: { parentName: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: { family: true, defaultVan: true },
    orderBy: { childName: "asc" },
  });

  return NextResponse.json(children);
}

export async function POST(req: NextRequest) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const body = await req.json();
  const {
    familyId, childName, birthday, age, medicalNotes,
    pickupRequired, pickupNotes, bestContactPhone, defaultVanId,
  } = body;

  if (!familyId || !childName) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const child = await prisma.child.create({
    data: {
      familyId,
      childName,
      birthday: birthday ? new Date(birthday) : null,
      age: age ? Number(age) : null,
      medicalNotes,
      pickupRequired: !!pickupRequired,
      pickupNotes,
      bestContactPhone,
      defaultVanId: defaultVanId || null,
    },
  });

  return NextResponse.json(child, { status: 201 });
}
