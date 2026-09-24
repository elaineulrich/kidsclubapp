import { NextRequest, NextResponse } from "next/server";
import { getPlaceDetails } from "@/lib/geocode";

// Unauthenticated on purpose, same as /api/address-search - resolves one Google Places
// prediction (picked from that endpoint) into a full address + coordinates.
export async function GET(req: NextRequest) {
  const placeId = req.nextUrl.searchParams.get("placeId")?.trim();
  if (!placeId) return NextResponse.json({ error: "Missing placeId" }, { status: 400 });

  const result = await getPlaceDetails(placeId);
  if (!result) return NextResponse.json({ error: "Could not resolve that address" }, { status: 502 });

  return NextResponse.json(result);
}
