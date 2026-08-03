import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/apiAuth";
import { geocodeAddress, geocodeChurchAddress, haversineMiles, LatLng } from "@/lib/geocode";

// POST: given a van's child stops, return a driving-friendly visit order plus each
// stop's distance from the church (miles, straight-line), so the admin UI can auto-sort
// a van's stops before publishing. Read-only aside from caching newly-geocoded
// coordinates back onto Family - doesn't touch RouteAssignment, since the caller may be
// sorting stops that haven't been saved yet.
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
  // Preserve the caller's original ordering for children not found/unresolved.
  const byId = new Map(children.map((c) => [c.id, c]));

  const distances: Record<string, number | null> = {};
  const coordsByChildId = new Map<string, LatLng>();

  for (const childId of childIds) {
    const child = byId.get(childId);
    const family = child?.family;
    if (!family) {
      distances[childId] = null;
      continue;
    }

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

    distances[childId] = coords ? haversineMiles(church, coords) : null;
    if (coords) coordsByChildId.set(childId, coords);
  }

  // Nearest-neighbor route: starting from the church, repeatedly hop to whichever
  // remaining stop is closest to the current position. This keeps stops that are
  // physically close to each other adjacent in the route, unlike sorting purely by
  // each stop's distance from the church (two stops can be equally far from church
  // but in opposite directions, or right next to each other but at slightly
  // different distances). Stops that couldn't be geocoded keep their original
  // relative order and sink to the end, same as before.
  const remaining = childIds.filter((id) => coordsByChildId.has(id));
  const unresolved = childIds.filter((id) => !coordsByChildId.has(id));

  const order: string[] = [];
  let current = church;
  while (remaining.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineMiles(current, coordsByChildId.get(remaining[i])!);
      if (d < nearestDist) {
        nearestDist = d;
        nearestIdx = i;
      }
    }
    const [nextId] = remaining.splice(nearestIdx, 1);
    order.push(nextId);
    current = coordsByChildId.get(nextId)!;
  }
  order.push(...unresolved);

  return NextResponse.json({ order, distances });
}
