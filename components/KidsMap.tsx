"use client";

import { useMemo, useState } from "react";
import { APIProvider, Map as GoogleMap, Marker, InfoWindow, useApiIsLoaded } from "@vis.gl/react-google-maps";

export type MapPin = {
  childId: string;
  childName: string;
  familyId: string;
  parentName: string;
  address: string;
  lat: number;
  lng: number;
  defaultVanId: string | null;
  defaultVanName: string | null;
};

// Siblings share their family's address, so their pins land on the exact same
// coordinate and stack perfectly on top of each other - only the topmost one is
// visible or clickable, which reads as kids missing from the map even though
// they're there. Grouping by family into one marker (listing every child in the
// InfoWindow) fixes that.
type FamilyGroup = {
  familyId: string;
  parentName: string;
  address: string;
  lat: number;
  lng: number;
  children: { childId: string; childName: string; defaultVanId: string | null; defaultVanName: string | null }[];
};

function groupByFamily(pins: MapPin[]): FamilyGroup[] {
  const groups = new Map<string, FamilyGroup>();
  for (const p of pins) {
    let group = groups.get(p.familyId);
    if (!group) {
      group = { familyId: p.familyId, parentName: p.parentName, address: p.address, lat: p.lat, lng: p.lng, children: [] };
      groups.set(p.familyId, group);
    }
    group.children.push({
      childId: p.childId,
      childName: p.childName,
      defaultVanId: p.defaultVanId,
      defaultVanName: p.defaultVanName,
    });
  }
  return Array.from(groups.values());
}

// A family's marker is colored by whichever van most of its kids ride - usually all
// of them, but siblings can be split across vans, and every child's own van still
// shows in the InfoWindow list regardless of which color "wins" for the pin itself.
function majorityVan(children: FamilyGroup["children"]): string | null {
  const counts = new Map<string | null, number>();
  for (const c of children) counts.set(c.defaultVanId, (counts.get(c.defaultVanId) ?? 0) + 1);
  let best: string | null = null;
  let bestCount = -1;
  for (const [vanId, count] of counts) {
    if (count > bestCount) {
      best = vanId;
      bestCount = count;
    }
  }
  return best;
}

export type MapVan = { id: string; vanName: string };

// A small, high-contrast categorical palette - cycled by van index so each van gets a
// consistent, distinguishable color regardless of how many vans there are. Unassigned
// kids always get the same neutral grey rather than a palette color, so they read as
// "needs a van" at a glance instead of looking like just another group.
const VAN_COLORS = ["#2563eb", "#dc2626", "#16a34a", "#d97706", "#7c3aed", "#0891b2", "#db2777", "#65a30d"];
const UNASSIGNED_COLOR = "#64748b";

function colorForVan(vanId: string | null, vanOrder: string[]): string {
  if (!vanId) return UNASSIGNED_COLOR;
  const idx = vanOrder.indexOf(vanId);
  return idx === -1 ? UNASSIGNED_COLOR : VAN_COLORS[idx % VAN_COLORS.length];
}

// <Map> itself waits internally for the Maps JS SDK to load before it does anything,
// but a marker's `icon` prop references the `google.maps.*` globals directly at
// render time - evaluating that before the SDK script has actually finished loading
// throws "google is not defined". useApiIsLoaded() (only usable inside <APIProvider>)
// is the signal to wait for, so the markers live in their own child component that
// renders nothing until it's true.
function MapMarkers({
  families,
  vanOrder,
  onSelect,
}: {
  families: FamilyGroup[];
  vanOrder: string[];
  onSelect: (familyId: string) => void;
}) {
  const loaded = useApiIsLoaded();
  if (!loaded) return null;

  return (
    <>
      {families.map((f) => (
        <Marker
          key={f.familyId}
          position={{ lat: f.lat, lng: f.lng }}
          onClick={() => onSelect(f.familyId)}
          label={
            f.children.length > 1
              ? { text: String(f.children.length), color: "#fff", fontSize: "11px", fontWeight: "700" }
              : undefined
          }
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: colorForVan(majorityVan(f.children), vanOrder),
            fillOpacity: 0.9,
            strokeColor: "#fff",
            strokeWeight: 1.5,
          }}
        />
      ))}
    </>
  );
}

export default function KidsMap({
  pins,
  vans,
  center,
}: {
  pins: MapPin[];
  vans: MapVan[];
  center: { lat: number; lng: number };
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const vanOrder = vans.map((v) => v.id);
  const families = useMemo(() => groupByFamily(pins), [pins]);
  const selected = families.find((f) => f.familyId === selectedId) ?? null;

  if (!apiKey) {
    return (
      <p className="text-sm text-amber-600">
        The map needs a Google Maps API key - set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in Railway to enable it.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3 text-sm">
        {vans.map((v, i) => (
          <span key={v.id} className="flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: VAN_COLORS[i % VAN_COLORS.length] }}
            />
            {v.vanName}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: UNASSIGNED_COLOR }} />
          No default van
        </span>
      </div>

      <div className="rounded-xl overflow-hidden border border-slate-200" style={{ height: "70vh" }}>
        <APIProvider apiKey={apiKey}>
          <GoogleMap defaultCenter={center} defaultZoom={11} disableDefaultUI={false} gestureHandling="greedy">
            <MapMarkers families={families} vanOrder={vanOrder} onSelect={setSelectedId} />
            {selected && (
              <InfoWindow position={{ lat: selected.lat, lng: selected.lng }} onCloseClick={() => setSelectedId(null)}>
                <div className="text-sm">
                  <p className="font-semibold">{selected.parentName}</p>
                  <p className="text-slate-500">{selected.address}</p>
                  <ul className="mt-1.5 space-y-0.5">
                    {selected.children.map((c) => (
                      <li key={c.childId}>
                        {c.childName} <span className="text-slate-500">&mdash; {c.defaultVanName ?? "No default van"}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        </APIProvider>
      </div>
    </div>
  );
}
