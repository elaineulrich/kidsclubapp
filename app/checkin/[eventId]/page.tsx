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

const UNASSIGNED_KEY = "__unassigned__";

function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

type RouteGroup = {
  key: string;
  vanName: string | null;
  driverName: string | null;
  driverPhone: string | null;
  children: RosterChild[];
};

function ChildRow({
  c,
  mode,
  busyChildId,
  setStatus,
}: {
  c: RosterChild;
  mode: Mode;
  busyChildId: string | null;
  setStatus: (childId: string, action: Action) => void;
}) {
  return (
    <div className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
      <div>
        <p className="font-semibold">{c.childName}</p>
        <p className="text-slate-500 text-sm">Parent: {c.parentName}</p>
        {c.medicalNotes && <p className="text-red-600 text-sm">⚠ {c.medicalNotes}</p>}
        {c.parentPhone && (
          <a
            href={telHref(c.parentPhone)}
            className="btn-secondary px-2 py-1 text-xs whitespace-nowrap inline-block mt-1.5"
          >
            📞 {c.parentPhone}
          </a>
        )}
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
  );
}

function CheckInRosterInner() {
  const params = useParams<{ eventId: string }>();
  const searchParams = useSearchParams();
  const mode: Mode = searchParams.get("mode") === "checkout" ? "checkout" : "checkin";

  const [data, setData] = useState<RosterData | null>(null);
  const [error, setError] = useState("");
  const [busyChildId, setBusyChildId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedRouteKey, setSelectedRouteKey] = useState<string | null>(null);

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

  // Grouped by route/van (with the driver's call button once per group), since that's
  // how check-in actually happens on the ground - one route/tab at a time as each van
  // arrives. Kids not on a route (direct drop-off) fall into their own "No Route" group.
  const routeGroups = useMemo(() => {
    const groups = new Map<string, RouteGroup>();
    const unassigned: RosterChild[] = [];
    for (const c of visibleChildren) {
      if (!c.vanName) {
        unassigned.push(c);
        continue;
      }
      const key = c.vanName;
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          vanName: c.vanName,
          driverName: c.driverName,
          driverPhone: c.driverPhone,
          children: [],
        });
      }
      groups.get(key)!.children.push(c);
    }
    const sorted = Array.from(groups.values()).sort((a, b) => (a.vanName ?? "").localeCompare(b.vanName ?? ""));
    if (unassigned.length > 0) {
      sorted.push({ key: UNASSIGNED_KEY, vanName: "No Route Assigned", driverName: null, driverPhone: null, children: unassigned });
    }
    return sorted;
  }, [visibleChildren]);

  // Keep the selected tab valid as the roster/mode/search changes - default to the
  // first route, and fall back if the current selection disappears (e.g. everyone
  // on that van got checked out and the checkout view no longer shows them).
  useEffect(() => {
    if (routeGroups.length === 0) {
      if (selectedRouteKey !== null) setSelectedRouteKey(null);
      return;
    }
    if (!routeGroups.some((g) => g.key === selectedRouteKey)) {
      setSelectedRouteKey(routeGroups[0].key);
    }
  }, [routeGroups, selectedRouteKey]);

  const isSearching = search.trim().length > 0;
  const selectedGroup = routeGroups.find((g) => g.key === selectedRouteKey) ?? null;

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
        ) : isSearching ? (
          // While searching, skip the tabs entirely so a match on another route isn't
          // hidden behind a tab the front-desk volunteer isn't currently on.
          <div className="space-y-4">
            {routeGroups.map((g) => (
              <div key={g.key} className="card p-0 overflow-hidden">
                <div className={g.key === UNASSIGNED_KEY ? "bg-slate-100 px-3.5 py-2.5 flex items-center justify-between gap-3 flex-wrap" : "bg-brand-50 px-3.5 py-2.5 flex items-center justify-between gap-3 flex-wrap"}>
                  <p className={g.key === UNASSIGNED_KEY ? "font-semibold text-slate-700" : "font-semibold text-brand-800"}>
                    {g.vanName}
                    {g.driverName && ` (${g.driverName})`}
                  </p>
                  {g.driverPhone && (
                    <a href={telHref(g.driverPhone)} className="btn-secondary px-2 py-1 text-xs whitespace-nowrap">
                      📞 Call Driver
                    </a>
                  )}
                </div>
                <div className="divide-y divide-slate-100 px-3.5">
                  {g.children.map((c) => (
                    <ChildRow key={c.id} c={c} mode={mode} busyChildId={busyChildId} setStatus={setStatus} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-3 px-3">
              {routeGroups.map((g) => (
                <button
                  key={g.key}
                  onClick={() => setSelectedRouteKey(g.key)}
                  className={
                    "shrink-0 px-3.5 py-2 rounded-full text-sm font-semibold whitespace-nowrap border " +
                    (g.key === selectedRouteKey
                      ? "bg-brand-600 text-white border-brand-600"
                      : "bg-white text-slate-600 border-slate-200")
                  }
                >
                  {g.vanName} ({g.children.length})
                </button>
              ))}
            </div>

            {selectedGroup && (
              <div className="card p-0 overflow-hidden">
                <div className={selectedGroup.key === UNASSIGNED_KEY ? "bg-slate-100 px-3.5 py-2.5 flex items-center justify-between gap-3 flex-wrap" : "bg-brand-50 px-3.5 py-2.5 flex items-center justify-between gap-3 flex-wrap"}>
                  <p className={selectedGroup.key === UNASSIGNED_KEY ? "font-semibold text-slate-700" : "font-semibold text-brand-800"}>
                    {selectedGroup.vanName}
                    {selectedGroup.driverName && ` (${selectedGroup.driverName})`}
                  </p>
                  {selectedGroup.driverPhone && (
                    <a href={telHref(selectedGroup.driverPhone)} className="btn-secondary px-2 py-1 text-xs whitespace-nowrap">
                      📞 Call Driver
                    </a>
                  )}
                </div>
                <div className="divide-y divide-slate-100 px-3.5">
                  {selectedGroup.children.map((c) => (
                    <ChildRow key={c.id} c={c} mode={mode} busyChildId={busyChildId} setStatus={setStatus} />
                  ))}
                </div>
              </div>
            )}
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
