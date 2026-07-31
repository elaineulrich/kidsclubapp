"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import SignOutButton from "@/components/SignOutButton";
import { navigateUrl, fullRouteUrl, embedRouteUrl } from "@/lib/maps";

type Stop = {
  id: string;
  stopOrder: number;
  status: "UNASSIGNED" | "ASSIGNED" | "PICKED_UP" | "COMPLETED" | "SKIPPED";
  childId: string;
  childName: string;
  parentName: string;
  address: string;
  pickupNotes: string | null;
  vanName: string | null;
};

type RouteData = {
  event: { id: string; eventName: string; eventDate: string };
  driver: { id: string; name: string };
  stops: Stop[];
  timing: "current" | "upcoming" | "past";
  churchAddress: string;
};

// Cycles through a fixed color per stop number, so a driver can match a stop card to its
// pin on the map at a glance. (The embedded map itself uses Google's default pin styling -
// matching pin colors would need the Static Maps API, which requires a Google Cloud API key.)
const STOP_COLORS = [
  "bg-red-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-lime-600",
  "bg-emerald-500",
  "bg-teal-500",
  "bg-blue-500",
  "bg-indigo-500",
  "bg-purple-500",
  "bg-pink-500",
];

export default function DriverRouteReviewPage() {
  const params = useParams<{ eventId: string }>();
  const [data, setData] = useState<RouteData | null>(null);
  const [error, setError] = useState("");
  const [busyStopId, setBusyStopId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/driver/route/${params.eventId}`);
    if (res.ok) {
      setData(await res.json());
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Could not load this route");
    }
  }, [params.eventId]);

  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(stopId: string, status: Stop["status"]) {
    setBusyStopId(stopId);
    await fetch(`/api/driver/route/${params.eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignmentId: stopId, status }),
    });
    setBusyStopId(null);
    load();
  }

  const stopGroups = useMemo(() => {
    if (!data) return [];
    const groups = new Map<string, Stop[]>();
    for (const s of data.stops) {
      const list = groups.get(s.address) ?? [];
      list.push(s);
      groups.set(s.address, list);
    }
    return Array.from(groups.entries()).map(([address, stops]) => ({
      address,
      stops: stops.sort((a, b) => a.stopOrder - b.stopOrder),
      minOrder: Math.min(...stops.map((s) => s.stopOrder)),
    })).sort((a, b) => a.minOrder - b.minOrder);
  }, [data]);

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm space-y-3">
          <p className="text-slate-500">{error}</p>
          <Link href="/driver/route" className="btn-secondary inline-block">Back to Routes</Link>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Loading route...</p>
      </main>
    );
  }

  const activeAddresses = [...new Set(
    data.stops.filter((s) => s.status !== "SKIPPED").map((s) => s.address)
  )];
  const mapSrc = embedRouteUrl(data.churchAddress, activeAddresses);
  const startUrl = fullRouteUrl(data.churchAddress, activeAddresses);
  const interactive = data.timing === "current";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="max-w-md mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/driver/route" className="text-sm text-brand-600">← All Routes</Link>
            <h1 className="text-xl font-bold text-slate-900">{data.event.eventName}</h1>
            <p className="text-slate-500 text-sm">
              {new Date(data.event.eventDate).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>
          <SignOutButton />
        </div>

        {data.stops.length === 0 ? (
          <p className="text-slate-500">No stops assigned for this route.</p>
        ) : (
          <>
            {mapSrc && (
              <div className="card p-0 overflow-hidden">
                <iframe
                  src={mapSrc}
                  title="Route map"
                  className="w-full h-80 border-0"
                  loading="lazy"
                />
              </div>
            )}

            {startUrl && (
              <a href={startUrl} target="_blank" rel="noopener noreferrer" className="text-center text-sm text-brand-600 block">
                Open full route in Google Maps ↗
              </a>
            )}

            <div className="space-y-3">
              {stopGroups.map((group, i) => (
                <div key={group.address} className="card space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <span
                        className={`inline-block rounded-md px-2 py-1 text-xs font-bold text-white ${STOP_COLORS[i % STOP_COLORS.length]}`}
                      >
                        STOP {i + 1}
                      </span>
                      <p className="text-slate-700 font-medium">{group.address}</p>
                    </div>
                    {interactive && (
                      <a
                        href={navigateUrl(group.address)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary shrink-0"
                      >
                        NAVIGATE
                      </a>
                    )}
                  </div>

                  <div className="divide-y divide-slate-100">
                    {group.stops.map((s) => (
                      <div key={s.id} className="py-2 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold">{s.childName}</p>
                          <p className="text-slate-500 text-sm">Parent: {s.parentName}</p>
                          {s.pickupNotes && <p className="text-amber-600 text-sm">Notes: {s.pickupNotes}</p>}
                        </div>

                        {s.status === "PICKED_UP" || s.status === "COMPLETED" ? (
                          <span className="text-emerald-600 font-semibold text-sm shrink-0">✓ Picked Up</span>
                        ) : s.status === "SKIPPED" ? (
                          <div className="text-right shrink-0">
                            <p className="text-slate-400 text-sm">Not coming</p>
                            {interactive && (
                              <button
                                className="text-xs text-brand-600 underline"
                                disabled={busyStopId === s.id}
                                onClick={() => setStatus(s.id, "ASSIGNED")}
                              >
                                Undo
                              </button>
                            )}
                          </div>
                        ) : interactive ? (
                          <div className="flex flex-col gap-1 shrink-0">
                            <button
                              className="btn-success px-3 py-2 text-sm"
                              disabled={busyStopId === s.id}
                              onClick={() => setStatus(s.id, "PICKED_UP")}
                            >
                              Picked Up
                            </button>
                            <button
                              className="btn-warning px-3 py-2 text-sm"
                              disabled={busyStopId === s.id}
                              onClick={() => setStatus(s.id, "SKIPPED")}
                            >
                              😢 Not Coming Today
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-sm shrink-0">Not picked up</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
