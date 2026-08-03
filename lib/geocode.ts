import { getOrSetCache } from "@/lib/redis";

// Free, no-API-key geocoder. Its usage policy caps requests at 1/sec, requires an
// identifying User-Agent, and asks callers to cache rather than re-request the same
// address - geocodeFamilyAddress() (see below) handles the caching side by persisting
// results on Family; this just enforces the pacing for whatever isn't cached yet.
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "HavenKidsClubManager/1.0";
const MIN_REQUEST_INTERVAL_MS = 1100;

let lastRequestAt = 0;

async function throttle() {
  const wait = lastRequestAt + MIN_REQUEST_INTERVAL_MS - Date.now();
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastRequestAt = Date.now();
}

export type LatLng = { lat: number; lng: number };

// Geocodes a raw address string. Returns null if it can't be resolved (e.g. a typo'd
// or incomplete address) rather than throwing - callers should treat that stop as
// "unknown distance" and leave it in place rather than fail the whole sort.
export async function geocodeAddress(address: string): Promise<LatLng | null> {
  await throttle();

  try {
    const url = `${NOMINATIM_URL}?format=json&limit=1&q=${encodeURIComponent(address)}`;
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) return null;

    const results: { lat: string; lon: string }[] = await res.json();
    if (results.length === 0) return null;

    return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
  } catch {
    return null;
  }
}

// The church address rarely changes and has nowhere natural to persist coordinates
// (it's an env var, not a DB row), so it's cached in Redis instead - falls through to
// a fresh lookup on every call if Redis isn't configured, which is fine since this
// runs at most once per auto-sort click.
export async function geocodeChurchAddress(address: string): Promise<LatLng | null> {
  return getOrSetCache(`geocode:church:${address}`, 60 * 60 * 24 * 30, () => geocodeAddress(address));
}

// Great-circle distance in miles - a straight-line approximation of driving distance.
// Good enough to consistently rank stops farthest-to-nearest; it won't perfectly match
// actual road distance (e.g. across a river or highway split), which would need a
// paid routing API.
export function haversineMiles(a: LatLng, b: LatLng): number {
  const R = 3958.8;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
