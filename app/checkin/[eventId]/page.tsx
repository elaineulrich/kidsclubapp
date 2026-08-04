"use client";

import { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import SignOutButton from "@/components/SignOutButton";

type CheckStatus = "NOT_YET" | "CHECKED_IN" | "CHECKED_OUT" | "SKIPPED";

type RosterChild = {
  id: string;
  childName: string;
  parentName: string;
  parentPhone: string;
  age: number | null;
  medicalNotes: string | null;
  vanName: string | null;
  driverName: string | null;
  driverPhone: string | null;
  status: CheckStatus;
  checkInTime: string | null;
  checkOutTime: string | null;
};

type RosterData = {
  event: { id: string; eventName: string; eventDate: string };
  children: RosterChild[];
};

type Mode = "checkin" | "checkout";
type Action = "in" | "out" | "skip" | "undo";

function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

function CheckInRosterInner() {
  const params = useParams<{ eventId: string }>();
  const searchParams = useSearchParams();
  const mode: Mode = searchParams.get("mode") === "checkout" ? "checkout" : "checkin";

  const [data, setData] = useState<RosterData | null>(null);
  const [error, setError] = useState("");
  const [busyChildId, setBusyChildId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/checkin/${params.eventId}`);
    if (res.ok) {
      setData(await res.json());
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Could not load this event");
    }
  }, [params.eventId]);

  useEffect(() => {
    load();
    // A driver working the same event's route can check kids in/out too - poll so
    // this list picks that up without a manual refresh, same as the reverse.
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

  async function setStatus(childId: string, action: Action) {
    setBusyChildId(childId);
    await fetch(`/api/checkin/${params.eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ childId, action }),
    });
    setBusyChildId(null);
    load();
  }

  // Check-out only makes sense for kids who were actually checked in; check-in shows everyone.
  const modeFiltered = useMemo(() => {
    if (!data) return [];
    if (mode === "checkin") return data.children;
    return data.children.filter((c) => c.status === "CHECKED_IN" || c.status === "CHECKED_OUT");
  }, [data, mode]);

  const visibleChildren = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return modeFiltered;
    return modeFiltered.filter(
      (c) => c.childName.toLowerCase().includes(q) || c.parentName.toLowerCase().includes(q)
    );
  }, [modeFiltered, search]);

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm space-y-3">
          <p className="text-slate-500">{error}</p>
          <Link href="/checkin" className="btn-secondary inline-block">Back to Events</Link>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Loading event...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-4">
      <div className="max-w-md mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/checkin" className="text-sm text-brand-600">← All Events</Link>
            <h1 className="text-xl font-bold text-slate-900">{data.event.eventName}</h1>
            <p className="text-slate-500 text-sm">
              {new Date(data.event.eventDate).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>
          <SignOutButton />
        </div>

        <div className="flex gap-2">
          <Link
            href={`/checkin/${params.eventId}?mode=checkin`}
            className={mode === "checkin" ? "btn-primary flex-1 text-center" : "btn-secondary flex-1 text-center"}
          >
            Check-In
          </Link>
          <Link
            href={`/checkin/${params.eventId}?mode=checkout`}
            className={mode === "checkout" ? "btn-primary flex-1 text-center" : "btn-secondary flex-1 text-center"}
          >
            Check-Out
          </Link>
        </div>

        <input
          className="input"
          placeholder="Search child or parent name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {data.children.length === 0 ? (
          <p className="text-slate-500">No active children in the roster.</p>
        ) : mode === "checkout" && modeFiltered.length === 0 ? (
          <p className="text-slate-500">No one has been checked in yet.</p>
        ) : visibleChildren.length === 0 ? (
          <p className="text-slate-400 text-center mt-4">No matching children found.</p>
        ) : (
          <div className="card divide-y divide-slate-100">
            {visibleChildren.map((c) => (
              <div key={c.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{c.childName}</p>
                  <p className="text-slate-500 text-sm">
                    <span>Parent: {c.parentName}</span>
                    {c.parentPhone && (
                      <>
                        {" "}
                        <a href={telHref(c.parentPhone)} className="text-brand-600 font-medium whitespace-nowrap">
                          📞&nbsp;{c.parentPhone}
                        </a>
                      </>
                    )}
                  </p>
                  {c.vanName && (
                    <p className="text-slate-500 text-sm">
                      <span>
                        Van: {c.vanName}
                        {c.driverName && ` (${c.driverName})`}
                      </span>
                      {c.driverPhone && (
                        <>
                          {" "}
                          <a href={telHref(c.driverPhone)} className="text-brand-600 font-medium whitespace-nowrap">
                            📞&nbsp;{c.driverPhone}
                          </a>
                        </>
                      )}
                    </p>
                  )}
                  {c.medicalNotes && <p className="text-red-600 text-sm">⚠ {c.medicalNotes}</p>}
                </div>

                {mode === "checkin" ? (
                  c.status === "CHECKED_IN" || c.status === "CHECKED_OUT" ? (
                    <div className="text-right shrink-0">
                      <p className="text-emerald-600 font-semibold text-sm">✓ Checked In</p>
                      <button
                        className="text-xs text-brand-600 underline"
                        disabled={busyChildId === c.id}
                        onClick={() => setStatus(c.id, "undo")}
                      >
                        Undo
                      </button>
                    </div>
                  ) : c.status === "SKIPPED" ? (
                    <div className="text-right shrink-0">
                      <p className="text-slate-400 text-sm">Not coming</p>
                      <button
                        className="text-xs text-brand-600 underline"
                        disabled={busyChildId === c.id}
                        onClick={() => setStatus(c.id, "undo")}
                      >
                        Undo
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        className="btn-success px-3 py-2 text-sm"
                        disabled={busyChildId === c.id}
                        onClick={() => setStatus(c.id, "in")}
                      >
                        Check In
                      </button>
                      <button
                        className="btn-warning px-3 py-2 text-sm"
                        disabled={busyChildId === c.id}
                        onClick={() => setStatus(c.id, "skip")}
                      >
                        😢 Not Coming Today
                      </button>
                    </div>
                  )
                ) : c.status === "CHECKED_OUT" ? (
                  <div className="text-right shrink-0">
                    <p className="text-emerald-600 font-semibold text-sm">✓ Checked Out</p>
                    <button
                      className="text-xs text-brand-600 underline"
                      disabled={busyChildId === c.id}
                      onClick={() => setStatus(c.id, "in")}
                    >
                      Undo
                    </button>
                  </div>
                ) : (
                  <button
                    className="btn-success px-3 py-2 text-sm"
                    disabled={busyChildId === c.id}
                    onClick={() => setStatus(c.id, "out")}
                  >
                    Check Out
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default function CheckInRosterPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Loading event...</p>
      </main>
    }>
      <CheckInRosterInner />
    </Suspense>
  );
}
