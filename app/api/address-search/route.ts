import { NextRequest, NextResponse } from "next/server";
import { searchAddress, searchAddressGoogle } from "@/lib/geocode";

// Unauthenticated on purpose - this only proxies public address search (no app data
// involved) and needs to work from the public Register form as well as the admin
// Families form.
//
// Prefers Google Places (far more complete US house-number coverage) when
// GOOGLE_PLACES_API_KEY is set; falls back to the free Nominatim search otherwise, same
// as this endpoint has always done. Also falls back to Nominatim if Google comes back
// empty even with a key set - a real "no matches" is rare for a partial US address, so
// an empty Google response is far more likely a misconfigured key (Places API (New)
// not enabled, wrong restrictions, billing) than a genuine miss, and silently returning
// nothing would make address search look broken instead of just degraded.
//
// A Google prediction only carries a placeId and needs a follow-up call to
// /api/address-search/details to resolve into a full address - a Nominatim result
// already has everything, so it comes back pre-"resolved". See
// components/AddressAutocomplete.tsx for how the two are told apart.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 5) return NextResponse.json({ results: [] });

  if (process.env.GOOGLE_PLACES_API_KEY) {
    const predictions = await searchAddressGoogle(q);
    if (predictions.length > 0) {
      return NextResponse.json({
        results: predictions.map((p) => ({ id: p.placeId, label: p.label })),
      });
    }
  }

  const results = await searchAddress(q);
  return NextResponse.json({
    results: results.map((r, i) => ({ id: String(i), label: r.label, resolved: r })),
  });
}
