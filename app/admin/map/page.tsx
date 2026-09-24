"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { MapPin, MapVan } from "@/components/KidsMap";

// Leaflet touches `window` on import, so the map itself can only render client-side -
// ssr:false keeps it out of the server render entirely rather than erroring on it.
const KidsMap = dynamic(() => import("@/components/KidsMap"), { ssr: false });

type UnresolvedChild = { childId: string; childName: string; parentName: string; address: string };

type MapData = {
  vans: MapVan[];
  pins: MapPin[];
  unresolved: UnresolvedChild[];
  church: { lat: number; lng: number } | null;
};

// Church address, roughly - used only as a fallback map center when it isn't
// configured or none of the kids' addresses could be geocoded yet.
const FALLBACK_CENTER = { lat: 39.8283, lng: -98.5795 };

export default function KidsMapPage() {
  const [data, setData] = useState<MapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/children/map")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setError("Couldn't load the map. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  const center =
    data?.church ?? (data?.pins.length ? { lat: data.pins[0].lat, lng: data.pins[0].lng } : FALLBACK_CENTER);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Kids Map</h1>
        <p className="text-slate-500 text-sm mt-1">
          Every child needing a ride, color-coded by their current default van - use this to spot who&apos;s
          clustered together before deciding which van/route to place them on.
        </p>
      </div>

      {loading && (
        <p className="text-slate-500">
          Loading map... the first load can take a bit while new addresses are geocoded.
        </p>
      )}
      {error && <p className="text-red-600">{error}</p>}

      {data && (
        <>
          {data.unresolved.length > 0 && (
            <div className="card bg-amber-50 border-amber-100 text-sm">
              <p className="text-amber-700 font-medium">
                {data.unresolved.length} child{data.unresolved.length === 1 ? "" : "ren"} couldn&apos;t be placed
                on the map - their address didn&apos;t resolve to a location. Double-check these in Admin &gt;
                Families:
              </p>
              <ul className="mt-2 space-y-1">
                {data.unresolved.map((c) => (
                  <li key={c.childId} className="text-amber-800">
                    <span className="font-medium">{c.childName}</span> ({c.parentName}) &mdash; {c.address}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <KidsMap pins={data.pins} vans={data.vans} center={center} />
        </>
      )}
    </div>
  );
}
