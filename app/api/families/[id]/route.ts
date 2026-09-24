import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/apiAuth";
import { sanitizeLatLng } from "@/lib/geocode";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireRole(["ADMIN", "VOLUNTEER"]);
  if (error) return error;

  const family = await prisma.family.findUnique({
    where: { id: params.id },
    include: { children: true },
  });
  if (!family) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(family);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const body = await req.json();
  const {
    parentName, phone, email, address, addressLine2, city, state, zip, lat, lng,
    emergencyContactName, emergencyContactPhone, emergencyContactRelationship, smsOptIn,
  } = body;

  const existing = await prisma.family.findUnique({
    where: { id: params.id },
    select: { address: true, city: true, state: true, zip: true },
  });
  const addressChanged =
    !!existing &&
    [
      address !== undefined && address !== existing.address,
      city !== undefined && city !== existing.city,
      state !== undefined && state !== existing.state,
      zip !== undefined && zip !== existing.zip,
    ].some(Boolean);

  // A fresh pick from AddressAutocomplete always wins. Otherwise, stale coordinates
  // are worse than none if any part of the address changed by hand - force a
  // re-geocode next time this family's route is auto-sorted.
  const { lat: validLat, lng: validLng } = sanitizeLatLng(lat, lng);
  const latLngUpdate =
    validLat !== null && validLng !== null
      ? { lat: validLat, lng: validLng }
      : addressChanged
        ? { lat: null, lng: null }
        : {};

  const family = await prisma.family.update({
    where: { id: params.id },
    data: {
      parentName, phone, email, address, addressLine2, city, state, zip,
      emergencyContactName, emergencyContactPhone, emergencyContactRelationship,
      smsOptIn: smsOptIn === true,
      ...latLngUpdate,
    },
  });

  return NextResponse.json(family);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  await prisma.family.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
