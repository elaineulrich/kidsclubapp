import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/apiAuth";
import { geocodeAddress, geocodeChurchAddress } from "@/lib/geocode";

// GET: every active, pickup-required child with a geocoded location, for the admin
// map view - lets an admin eyeball which kids cluster together before deciding which
// van/route to place them on. Read-only aside from caching newly-geocoded
// coordinates back onto Family, same as the route-sorting endpoint.
export async function GET() {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const vans = await prisma.van.findMany({
    where: { activeStatus: true },
    select: { id: true, vanName: true },
    orderBy: { vanName: "asc" },
  });

  const children = await prisma.child.findMany({
    where: { activeStatus: true, pickupRequired: true },
    include: { family: true, defaultVan: true },
    orderBy: { childName: "asc" },
  });

  const pins = [];
  let unresolvedCount = 0;

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

    if (!coords) {
      unresolvedCount += 1;
      continue;
    }

    pins.push({
      childId: child.id,
      childName: child.childName,
      parentName: family.parentName,
      address: [family.address, family.addressLine2, `${family.city}, ${family.state} ${family.zip}`]
        .filter(Boolean)
        .join(", "),
      lat: coords.lat,
      lng: coords.lng,
      defaultVanId: child.defaultVanId,
      defaultVanName: child.defaultVan?.vanName ?? null,
    });
  }

  const churchAddress = process.env.CHURCH_ADDRESS;
  const church = churchAddress ? await geocodeChurchAddress(churchAddress) : null;

  return NextResponse.json({ vans, pins, unresolvedCount, church });
}
