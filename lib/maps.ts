export function navigateUrl(destination: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

// Builds a round-trip route: leaves from `origin` (the church), hits every stop in order,
// then returns to `origin`. Falls back to ending at the last stop if no origin is set,
// since there's nowhere configured to loop back to.
export function fullRouteUrl(origin: string, stopAddresses: string[]) {
  if (stopAddresses.length === 0) return "";

  const params = new URLSearchParams({ api: "1" });

  if (origin) {
    params.set("origin", origin);
    params.set("destination", origin);
    params.set("waypoints", stopAddresses.join("|"));
  } else {
    const destination = stopAddresses[stopAddresses.length - 1];
    const waypoints = stopAddresses.slice(0, -1);
    params.set("destination", destination);
    if (waypoints.length > 0) params.set("waypoints", waypoints.join("|"));
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

// Embeddable preview of the same round-trip route, for showing a map inline (e.g. in an
// <iframe>) without a Google Maps API key. Uses the legacy `output=embed` parameter, which
// Google still serves without the framing restrictions of the standard maps.google.com page.
export function embedRouteUrl(origin: string, stopAddresses: string[]) {
  if (stopAddresses.length === 0) return "";
  const destinations = origin ? [...stopAddresses, origin] : stopAddresses;
  const daddr = destinations.map(encodeURIComponent).join("+to:");
  const params = new URLSearchParams({ output: "embed" });
  if (origin) params.set("saddr", origin);
  return `https://maps.google.com/maps?daddr=${daddr}&${params.toString()}`;
}
