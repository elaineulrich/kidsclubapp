import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/apiAuth";
import { geocodeAddress, geocodeChurchAddress, haversineMiles } from "@/lib/geocode";

// POST: distance in miles from the church to each given child's family address, so the
// admin UI can sort a van's stops farthest-first before publishing. Read-only aside from
// caching newly-geocoded coordinates back onto Family - doesn't touch RouteAssignment,
// since the caller may be sorting stops that haven't been saved yet.
export async function POST(req: NextRequest) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const { childIds }: { childIds?: string[] } = await req.json();
  if (!childIds || childIds.length === 0) {
    return NextResponse.json({ error: "Missing childIds" }, { status: 400 });
  }

  const churchAddress = process.env.CHURCH_ADDRESS;
  if (!churchAddress) {
    return NextResponse.json({ error: "CHURCH_ADDRESS is not configured" }, { status: 400 });
  }
  const church = await geocodeChurchAddress(churchAddress);
  if (!church) {
    return NextResponse.json({ error: "Could not geocode the church address" }, { status: 400 });
  }

  const children = await prisma.child.findMany({
    where: { id: { in: childIds } },
    include: { family: true },
  });

  const distances: Record<string, number | null> = {};
  for (const child of children) {
    const family = child.family;
    let coords = family.lat !== null && family.lng !== null ? { lat: family.lat, lng: family.lng } : null;

    if (!coords) {
      const fullAddress = [family.address, family.addressLine2, `${family.city}, ${family.state} ${family.zip}`]
        .filter(Boolean)
        .join(", ");
      coords = await geocodeAddress(fullAddress);
      if (coords) {
        await prisma.family.update({ where: { id: family.id }, data: { lat: coords.lat, lng: coords.lng } });
      }
    }

    distances[child.id] = coords ? haversineMiles(church, coords) : null;
  }

  return NextResponse.json({ distances });
}
