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

// A short "123 Main St, Hillsboro, TX 76645" label for the suggestion dropdown -
// Nominatim's own display_name is the full geocoder hierarchy (county, country, ...),
// which is more than someone picking their own address needs to see.
function suggestionLabel(street: string, city: string, state: string, zip: string): string {
  const cityStateZip = [city, [state, zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  return [street, cityStateZip].filter(Boolean).join(", ");
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
        const city = cityName(r.address);
        const state = stateAbbreviation(r.address);
        const zip = r.address.postcode ?? "";
        return {
          label: suggestionLabel(street, city, state, zip),
          address: street,
          city,
          state,
          zip,
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lon),
        };
      })
      .filter((r) => r.address);
  } catch {
    return [];
  }
}

const GOOGLE_PLACES_AUTOCOMPLETE_URL = "https://places.googleapis.com/v1/places:autocomplete";
const GOOGLE_PLACES_DETAILS_URL = "https://places.googleapis.com/v1/places";

export type PlacePrediction = { placeId: string; label: string };

// Google Places Autocomplete (New) - used instead of Nominatim when
// GOOGLE_PLACES_API_KEY is set, since Google's US house-number coverage is far more
// complete than OpenStreetMap's (Nominatim often only has the street, not every
// specific house number, especially in smaller towns). Only returns a placeId + label
// text - getPlaceDetails() below resolves the one the user actually picks into a full
// address + coordinates, since Places bills Details separately from Autocomplete and
// it'd be wasteful to resolve every prediction shown instead of just the chosen one.
export async function searchAddressGoogle(query: string): Promise<PlacePrediction[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return [];

  try {
    const res = await fetch(GOOGLE_PLACES_AUTOCOMPLETE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "suggestions.placePrediction.placeId,suggestions.placePrediction.text",
      },
      body: JSON.stringify({ input: query, includedRegionCodes: ["us"] }),
    });
    if (!res.ok) return [];

    const data: { suggestions?: { placePrediction?: { placeId: string; text: { text: string } } }[] } =
      await res.json();
    return (data.suggestions ?? [])
      .map((s) => s.placePrediction)
      .filter((p): p is { placeId: string; text: { text: string } } => !!p)
      .map((p) => ({ placeId: p.placeId, label: p.text.text }));
  } catch {
    return [];
  }
}

type GoogleAddressComponent = { longText: string; shortText: string; types: string[] };
type GooglePlaceDetails = {
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  addressComponents?: GoogleAddressComponent[];
};

function googleComponent(components: GoogleAddressComponent[] | undefined, type: string, short = false): string {
  const c = components?.find((c) => c.types.includes(type));
  if (!c) return "";
  return short ? c.shortText : c.longText;
}

// Resolves one Google Places prediction (by placeId, from searchAddressGoogle above)
// into a full address + coordinates.
export async function getPlaceDetails(placeId: string): Promise<AddressSuggestion | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(`${GOOGLE_PLACES_DETAILS_URL}/${placeId}`, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "formattedAddress,location,addressComponents",
      },
    });
    if (!res.ok) return null;

    const data: GooglePlaceDetails = await res.json();
    if (!data.location) return null;

    const street = [
      googleComponent(data.addressComponents, "street_number"),
      googleComponent(data.addressComponents, "route"),
    ]
      .filter(Boolean)
      .join(" ");
    const city =
      googleComponent(data.addressComponents, "locality") ||
      googleComponent(data.addressComponents, "sublocality") ||
      googleComponent(data.addressComponents, "administrative_area_level_3");
    const state = googleComponent(data.addressComponents, "administrative_area_level_1", true);
    const zip = googleComponent(data.addressComponents, "postal_code");

    return {
      label: data.formattedAddress ?? [street, city, state, zip].filter(Boolean).join(", "),
      address: street,
      city,
      state,
      zip,
      lat: data.location.latitude,
      lng: data.location.longitude,
    };
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
