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

// Validates a client-supplied lat/lng pair (e.g. from AddressAutocomplete) before it's
// trusted and persisted - either both are a sane coordinate, or neither is kept, since
// a fallback to lazy re-geocoding later is safer than a mismatched partial pair.
export function sanitizeLatLng(lat: unknown, lng: unknown): { lat: number | null; lng: number | null } {
  const validLat = typeof lat === "number" && Number.isFinite(lat) && lat >= -90 && lat <= 90;
  const validLng = typeof lng === "number" && Number.isFinite(lng) && lng >= -180 && lng <= 180;
  return validLat && validLng ? { lat: lat as number, lng: lng as number } : { lat: null, lng: null };
}

async function geocodeOnce(address: string): Promise<LatLng | null> {
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

// Rural Texas road abbreviations (FM286, CR105, RM12, ...) are usually written with no
// space before the number, but Nominatim's parser only recognizes them with one
// ("FM 286") - without this, an otherwise-valid address silently fails to geocode.
function withSpacedRoadAbbreviation(address: string): string | null {
  const normalized = address.replace(/\b(FM|RM|CR|SH|US|SL|SPUR|LOOP)(\d)/gi, "$1 $2");
  return normalized !== address ? normalized : null;
}

// Geocodes a raw address string. Returns null if it can't be resolved (e.g. a typo'd
// or incomplete address) rather than throwing - callers should treat that stop as
// "unknown distance" and leave it in place rather than fail the whole sort.
export async function geocodeAddress(address: string): Promise<LatLng | null> {
  const result = await geocodeOnce(address);
  if (result) return result;

  const normalized = withSpacedRoadAbbreviation(address);
  return normalized ? geocodeOnce(normalized) : null;
}

export type AddressSuggestion = {
  label: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
};

type NominatimAddressDetails = {
  house_number?: string;
  road?: string;
  city?: string;
  town?: string;
  village?: string;
  hamlet?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  "ISO3166-2-lvl4"?: string;
};

// Nominatim gives the full state name (e.g. "Texas"), but every address field in this
// app is a plain text input already holding 2-letter codes - ISO3166-2-lvl4 ("US-TX")
// is the reliable way to get the abbreviation; fall back to the full name if it's
// somehow missing rather than leave the field blank.
function stateAbbreviation(details: NominatimAddressDetails): string {
  const iso = details["ISO3166-2-lvl4"];
  if (iso?.startsWith("US-")) return iso.slice(3);
  return details.state ?? "";
}

// Rural/unincorporated addresses don't have a "city" - Nominatim uses whichever of
// these its data actually has, in roughly most-specific-first order.
function cityName(details: NominatimAddressDetails): string {
  return details.city ?? details.town ?? details.village ?? details.hamlet ?? details.suburb ?? "";
}

// Address-search-as-you-type for the autocomplete UI, scoped to the US since this app
// only serves one Texas community. Shares the module-level throttle with geocodeOnce
// so a burst of keystrokes still respects Nominatim's 1 req/sec policy.
export async function searchAddress(query: string): Promise<AddressSuggestion[]> {
  await throttle();

  try {
    const url = `${NOMINATIM_URL}?format=jsonv2&addressdetails=1&limit=5&countrycodes=us&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) return [];

    const results: {
      display_name: string;
      lat: string;
      lon: string;
      address: NominatimAddressDetails;
    }[] = await res.json();

    return results
      .map((r) => {
        const street = [r.address.house_number, r.address.road].filter(Boolean).join(" ");
        return {
          label: r.display_name,
          address: street,
          city: cityName(r.address),
          state: stateAbbreviation(r.address),
          zip: r.address.postcode ?? "",
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lon),
        };
      })
      .filter((r) => r.address);
  } catch {
    return [];
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
