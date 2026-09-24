"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";

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
  const vanOrder = vans.map((v) => v.id);

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
        <MapContainer center={[center.lat, center.lng]} zoom={11} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {pins.map((p) => (
            <CircleMarker
              key={p.childId}
              center={[p.lat, p.lng]}
              radius={8}
              pathOptions={{
                color: "#fff",
                weight: 1.5,
                fillColor: colorForVan(p.defaultVanId, vanOrder),
                fillOpacity: 0.9,
              }}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">{p.childName}</p>
                  <p>{p.parentName}</p>
                  <p className="text-slate-500">{p.address}</p>
                  <p className="mt-1">{p.defaultVanName ?? "No default van"}</p>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
