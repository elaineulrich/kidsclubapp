"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import SignOutButton from "@/components/SignOutButton";
import { navigateUrl, fullRouteUrl } from "@/lib/maps";

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
  event: { id: string; eventName: string; eventDate: string } | null;
  driver: { id: string; name: string } | null;
  stops: Stop[];
  churchAddress: string;
};

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
}

export default function DriverRoutePage() {
  const { data: session } = useSession();
  const [data, setData] = useState<RouteData | null>(null);
  const [busyStopId, setBusyStopId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/driver/route");
    if (res.ok) setData(await res.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function markPickedUp(stopId: string) {
    setBusyStopId(stopId);
    await fetch("/api/driver/route", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignmentId: stopId, status: "PICKED_UP" }),
    });
    setBusyStopId(null);
    load();
  }

  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Loading route...</p>
      </main>
    );
  }

  if (!data.event) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <h1 className="text-xl font-bold mb-2">No Route Today</h1>
          <p className="text-slate-500 mb-4">There is no event scheduled today, or you have no assigned stops.</p>
          <SignOutButton />
        </div>
      </main>
    );
  }

  const vanName = data.stops[0]?.vanName ?? "Van";
  const fullRoute = fullRouteUrl(data.churchAddress, data.stops.map((s) => s.address));

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="max-w-md mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {greeting()} {data.driver?.name}
            </h1>
            <p className="text-slate-500 text-sm">{vanName} Pickup Route</p>
          </div>
          <SignOutButton />
        </div>

        {data.stops.length === 0 ? (
          <p className="text-slate-500">You have no stops assigned for today.</p>
        ) : (
          <>
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
                  ) : (
                    <div className="flex gap-2 mt-3">
                      <a
                        href={navigateUrl(s.address)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary flex-1"
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
                  )}
                </div>
              ))}
            </div>

            <a href={fullRoute} target="_blank" rel="noopener noreferrer" className="btn-primary w-full block text-center">
              START FULL ROUTE
            </a>
          </>
        )}
      </div>
    </main>
  );
}
