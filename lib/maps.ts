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
