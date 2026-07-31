"use client";

import { useEffect, useState, useCallback, useMemo, useRef, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
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

type Mode = "checkin" | "checkout";

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

const CONFETTI_COLORS = ["#2f77c1", "#ffc004", "#ef4444", "#10b981", "#a855f7", "#f97316"];

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        duration: 2.2 + Math.random() * 1.6,
        delay: Math.random() * 0.6,
      })),
    []
  );

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-[60]">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            backgroundColor: p.color,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

function CelebrationModal({ kind, onContinue, onStartCheckout }: {
  kind: "checkin" | "checkout";
  onContinue: () => void;
  onStartCheckout: (() => void) | null;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center px-4">
      <Confetti />
      <div className="card max-w-sm w-full text-center space-y-4 relative z-[61]">
        <p className="text-4xl">🎉</p>
        <p className="text-xl font-bold text-emerald-600">
          {kind === "checkin" ? "Check-In Route Completed!" : "Check-Out Route Completed!"}
        </p>
        <p className="text-slate-500 text-sm">
          {kind === "checkin"
            ? "Every child on this route is checked in or marked not coming."
            : "Every checked-in child has been checked out."}
        </p>
        <div className="space-y-2">
          {onStartCheckout && (
            <button className="btn-gradient w-full" onClick={onStartCheckout}>
              Start Check-Out Route
            </button>
          )}
          <button className="btn-secondary w-full" onClick={onContinue}>
            {onStartCheckout ? "Stay Here" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DriverRouteReviewInner() {
  const params = useParams<{ eventId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const mode: Mode = searchParams.get("mode") === "checkout" ? "checkout" : "checkin";

  const [data, setData] = useState<RouteData | null>(null);
  const [error, setError] = useState("");
  const [busyStopId, setBusyStopId] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<Mode | null>(null);
  const prevComplete = useRef<{ checkin: boolean; checkout: boolean } | null>(null);

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

  // Check-out only makes sense for kids who were actually checked in; check-in shows everyone.
  const visibleStops = useMemo(() => {
    if (!data) return [];
    if (mode === "checkin") return data.stops;
    return data.stops.filter((s) => s.status === "PICKED_UP" || s.status === "COMPLETED");
  }, [data, mode]);

  const notYetCheckedInCount = data
    ? data.stops.filter((s) => s.status !== "PICKED_UP" && s.status !== "COMPLETED").length
    : 0;

  const stopGroups = useMemo(() => {
    const groups = new Map<string, Stop[]>();
    for (const s of visibleStops) {
      const list = groups.get(s.address) ?? [];
      list.push(s);
      groups.set(s.address, list);
    }
    return Array.from(groups.entries()).map(([address, stops]) => ({
      address,
      stops: stops.sort((a, b) => a.stopOrder - b.stopOrder),
      minOrder: Math.min(...stops.map((s) => s.stopOrder)),
    })).sort((a, b) => a.minOrder - b.minOrder);
  }, [visibleStops]);

  const checkInComplete = !!data && data.stops.length > 0 && data.stops.every(
    (s) => s.status === "PICKED_UP" || s.status === "COMPLETED" || s.status === "SKIPPED"
  );
  const checkedInStops = data ? data.stops.filter((s) => s.status === "PICKED_UP" || s.status === "COMPLETED") : [];
  const checkOutComplete = checkedInStops.length > 0 && checkedInStops.every((s) => s.status === "COMPLETED");

  // Only celebrate on a genuine false -> true transition for the active mode, not on every
  // page load of an already-completed route (prevComplete starts null so the first load just
  // records a baseline without firing).
  useEffect(() => {
    if (!data) return;
    const prev = prevComplete.current;
    if (prev) {
      if (mode === "checkin" && !prev.checkin && checkInComplete) setCelebration("checkin");
      if (mode === "checkout" && !prev.checkout && checkOutComplete) setCelebration("checkout");
    }
    prevComplete.current = { checkin: checkInComplete, checkout: checkOutComplete };
  }, [data, mode, checkInComplete, checkOutComplete]);

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
    visibleStops.filter((s) => s.status !== "SKIPPED").map((s) => s.address)
  )];
  const mapSrc = embedRouteUrl(data.churchAddress, activeAddresses);
  const startUrl = fullRouteUrl(data.churchAddress, activeAddresses);
  const interactive = data.timing === "current";

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-4">
      {celebration && (
        <CelebrationModal
          kind={celebration}
          onContinue={() => setCelebration(null)}
          onStartCheckout={
            celebration === "checkin" && interactive
              ? () => {
                  setCelebration(null);
                  router.push(`/driver/route/${data.event.id}?mode=checkout`);
                }
              : null
          }
        />
      )}
      <div className="max-w-md mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/driver/route" className="text-sm text-brand-600">← All Routes</Link>
            <h1 className="text-xl font-bold text-slate-900">{data.event.eventName}</h1>
            <p className="text-slate-500 text-sm">
              {new Date(data.event.eventDate).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
              {" · "}
              <span className={mode === "checkin" ? "text-brand-600 font-medium" : "text-purple-600 font-medium"}>
                {mode === "checkin" ? "Check-In Route" : "Check-Out Route"}
              </span>
            </p>
          </div>
          <SignOutButton />
        </div>

        {mode === "checkin" && checkInComplete && (
          <div className="card bg-emerald-50 border-emerald-200 text-center space-y-2">
            <p className="text-emerald-700 font-bold">✓ Check-In Route Completed!</p>
            {interactive && (
              <Link href={`/driver/route/${data.event.id}?mode=checkout`} className="btn-gradient w-full block text-center">
                Start Check-Out Route
              </Link>
            )}
          </div>
        )}
        {mode === "checkout" && checkOutComplete && (
          <div className="card bg-emerald-50 border-emerald-200 text-center">
            <p className="text-emerald-700 font-bold">🎉 Check-Out Route Completed!</p>
          </div>
        )}

        {data.stops.length === 0 ? (
          <p className="text-slate-500">No stops assigned for this route.</p>
        ) : mode === "checkout" && visibleStops.length === 0 ? (
          <p className="text-slate-500">No one has been checked in yet - start the Check-In Route first.</p>
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
              <a href={startUrl} target="_blank" rel="noopener noreferrer" className="btn-gradient w-full block text-center">
                Open Full Route in Google Maps ↗
              </a>
            )}

            {mode === "checkout" && notYetCheckedInCount > 0 && (
              <p className="text-xs text-slate-400 text-center">
                {notYetCheckedInCount} child{notYetCheckedInCount === 1 ? "" : "ren"} not checked in yet - hidden from this list.
              </p>
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

                        {mode === "checkin" ? (
                          s.status === "PICKED_UP" || s.status === "COMPLETED" ? (
                            <div className="text-right shrink-0">
                              <p className="text-emerald-600 font-semibold text-sm">✓ Checked In</p>
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
                                Checked In
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
                            <span className="text-slate-400 text-sm shrink-0">Not checked in</span>
                          )
                        ) : (
                          s.status === "COMPLETED" ? (
                            <div className="text-right shrink-0">
                              <p className="text-emerald-600 font-semibold text-sm">✓ Checked Out</p>
                              {interactive && (
                                <button
                                  className="text-xs text-brand-600 underline"
                                  disabled={busyStopId === s.id}
                                  onClick={() => setStatus(s.id, "PICKED_UP")}
                                >
                                  Undo
                                </button>
                              )}
                            </div>
                          ) : interactive ? (
                            <button
                              className="btn-success px-3 py-2 text-sm"
                              disabled={busyStopId === s.id}
                              onClick={() => setStatus(s.id, "COMPLETED")}
                            >
                              Checked Out
                            </button>
                          ) : (
                            <span className="text-slate-400 text-sm shrink-0">Not checked out</span>
                          )
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {data.churchAddress && (
              <a
                href={navigateUrl(data.churchAddress)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary w-full block text-center sticky bottom-4"
              >
                🏠 Back to Church
              </a>
            )}
          </>
        )}
      </div>
    </main>
  );
}

export default function DriverRouteReviewPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Loading route...</p>
      </main>
    }>
      <DriverRouteReviewInner />
    </Suspense>
  );
}
