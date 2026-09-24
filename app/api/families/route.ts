import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/apiAuth";
import { sanitizeLatLng } from "@/lib/geocode";

export async function GET(req: NextRequest) {
  const { error } = await requireRole(["ADMIN", "VOLUNTEER"]);
  if (error) return error;

  const q = req.nextUrl.searchParams.get("q")?.trim();

  const families = await prisma.family.findMany({
    where: q
      ? {
          OR: [
            { parentName: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: { children: true },
    orderBy: { parentName: "asc" },
  });

  return NextResponse.json(families);
}

export async function POST(req: NextRequest) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const body = await req.json();
  const {
    parentName, phone, email, address, addressLine2, city, state, zip, lat, lng,
    emergencyContactName, emergencyContactPhone, emergencyContactRelationship, smsOptIn,
  } = body;

  if (!parentName || !phone || !address || !city || !state || !zip) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Set when the admin picked a suggestion from AddressAutocomplete - saves a
  // geocoding round-trip later (route auto-sort, the Kids Map).
  const { lat: validLat, lng: validLng } = sanitizeLatLng(lat, lng);

  const family = await prisma.family.create({
    data: {
      parentName, phone, email, address, addressLine2, city, state, zip,
      emergencyContactName, emergencyContactPhone, emergencyContactRelationship,
      smsOptIn: smsOptIn === true,
      lat: validLat,
      lng: validLng,
    },
  });

  return NextResponse.json(family, { status: 201 });
}
