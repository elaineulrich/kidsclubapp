"use client";

import { useState } from "react";
import { APIProvider, Map, Marker, InfoWindow } from "@vis.gl/react-google-maps";

export type MapPin = {
  childId: string;
  childName: string;
  parentName: string;
  address: string;
  lat: number;
  lng: number;
  defaultVanId: string | null;
  defaultVanName: string | null;
};

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
  const selected = pins.find((p) => p.childId === selectedId) ?? null;

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
          <Map defaultCenter={center} defaultZoom={11} disableDefaultUI={false} gestureHandling="greedy">
            {pins.map((p) => (
              <Marker
                key={p.childId}
                position={{ lat: p.lat, lng: p.lng }}
                onClick={() => setSelectedId(p.childId)}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 8,
                  fillColor: colorForVan(p.defaultVanId, vanOrder),
                  fillOpacity: 0.9,
                  strokeColor: "#fff",
                  strokeWeight: 1.5,
                }}
              />
            ))}
            {selected && (
              <InfoWindow position={{ lat: selected.lat, lng: selected.lng }} onCloseClick={() => setSelectedId(null)}>
                <div className="text-sm">
                  <p className="font-semibold">{selected.childName}</p>
                  <p>{selected.parentName}</p>
                  <p className="text-slate-500">{selected.address}</p>
                  <p className="mt-1">{selected.defaultVanName ?? "No default van"}</p>
                </div>
              </InfoWindow>
            )}
          </Map>
        </APIProvider>
      </div>
    </div>
  );
}
