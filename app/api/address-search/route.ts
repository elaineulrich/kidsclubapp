import { NextRequest, NextResponse } from "next/server";
import { searchAddress } from "@/lib/geocode";

// Unauthenticated on purpose - this only proxies Nominatim's public address search
// (no app data involved) and needs to work from the public Register form as well as
// the admin Families form.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 5) return NextResponse.json({ results: [] });

  const results = await searchAddress(q);
  return NextResponse.json({ results });
}
