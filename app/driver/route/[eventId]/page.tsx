"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import SignOutButton from "@/components/SignOutButton";
import { navigateUrl, fullRouteUrl, embedRouteUrl } from "@/lib/maps";

type Stop = {
  id: string;
  stopOrder: number;
  status: "UNASSIGNED" | "ASSIGNED" | "PICKED_UP" | "COMPLETED";
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

  async function markPickedUp(stopId: string) {
    setBusyStopId(stopId);
    await fetch(`/api/driver/route/${params.eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignmentId: stopId, status: "PICKED_UP" }),
    });
    setBusyStopId(null);
    load();
  }

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

  const addresses = data.stops.map((s) => s.address);
  const mapSrc = embedRouteUrl(data.churchAddress, addresses);
  const startUrl = fullRouteUrl(data.churchAddress, addresses);
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
                  className="w-full h-56 border-0"
                  loading="lazy"
                />
              </div>
            )}

            <a href={startUrl} target="_blank" rel="noopener noreferrer" className="btn-primary w-full block text-center">
              START ROUTE IN GOOGLE MAPS
            </a>

            <div className="space-y-3">
              {data.stops.map((s, i) => (
                <div key={s.id} className="card">
                  <p className="text-sm text-slate-400">Stop {i + 1}</p>
                  <p className="text-xl font-bold">{s.childName}</p>
                  <p className="text-slate-600">{s.address}</p>
                  <p className="text-slate-500 text-sm">Parent: {s.parentName}</p>
                  {s.pickupNotes && <p className="text-amber-600 text-sm">Notes: {s.pickupNotes}</p>}

                  {s.status === "PICKED_UP" || s.status === "COMPLETED" ? (
                    <p className="text-emerald-600 font-semibold mt-2">✓ Picked Up</p>
                  ) : interactive ? (
                    <div className="flex gap-2 mt-3">
                      <a
                        href={navigateUrl(s.address)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary flex-1"
                      >
                        NAVIGATE
                      </a>
                      <button
                        className="btn-success flex-1"
                        disabled={busyStopId === s.id}
                        onClick={() => markPickedUp(s.id)}
                      >
                        Picked Up
                      </button>
                    </div>
                  ) : (
                    <p className="text-slate-400 text-sm mt-2">Not picked up</p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
