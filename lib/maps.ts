export function navigateUrl(destination: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

export function fullRouteUrl(origin: string, stopAddresses: string[]) {
  if (stopAddresses.length === 0) return "";
  const destination = stopAddresses[stopAddresses.length - 1];
  const waypoints = stopAddresses.slice(0, -1);

  const params = new URLSearchParams({
    api: "1",
    destination,
  });
  if (origin) params.set("origin", origin);
  if (waypoints.length > 0) params.set("waypoints", waypoints.join("|"));

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

// Embeddable preview of a multi-stop route, for showing a map inline (e.g. in an <iframe>)
// without a Google Maps API key. Uses the legacy `output=embed` parameter, which Google
// still serves without the framing restrictions of the standard maps.google.com page.
export function embedRouteUrl(origin: string, stopAddresses: string[]) {
  if (stopAddresses.length === 0) return "";
  const daddr = stopAddresses.map(encodeURIComponent).join("+to:");
  const params = new URLSearchParams({ output: "embed" });
  if (origin) params.set("saddr", origin);
  return `https://maps.google.com/maps?daddr=${daddr}&${params.toString()}`;
}
