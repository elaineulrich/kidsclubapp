"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type Van = { id: string; vanName: string; capacity: number; driver: { id: string; name: string } | null };
type EventOption = { id: string; eventName: string; eventDate: string };
type UnassignedChild = {
  childId: string;
  childName: string;
  parentName: string;
  pickupNotes: string | null;
  address: string;
  suggestedVanId: string | null;
  suggestedVanName: string | null;
};
type Stop = { childId: string; childName: string; vanId: string; stopOrder: number };
type EventDetail = { id: string; eventName: string; routesConfirmedAt: string | null };
type ConfirmResult = {
  routesConfirmedAt: string;
  drivers: {
    driver: { id: string; name: string; phone: string; email: string | null };
    vanName: string | null;
    stopCount: number;
    routePath: string;
    email: { sent: boolean; error?: string };
  }[];
};

function RoutesPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const eventId = searchParams.get("eventId");

  const [events, setEvents] = useState<EventOption[]>([]);
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [vans, setVans] = useState<Van[]>([]);
  const [unassigned, setUnassigned] = useState<UnassignedChild[]>([]);
  const [assignments, setAssignments] = useState<Record<string, Stop>>({});
  const [originalAssigned, setOriginalAssigned] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmResult, setConfirmResult] = useState<ConfirmResult | null>(null);
  const [editMode, setEditMode] = useState(true);
  const [sortingVanId, setSortingVanId] = useState<string | null>(null);
  const [sortMessage, setSortMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/events").then((r) => r.json()).then((evts: EventOption[]) => {
      setEvents(evts);
      if (!eventId && evts.length > 0) {
        router.replace(`/admin/routes?eventId=${evts[0].id}`);
      }
    });
  }, [eventId, router]);

  const load = useCallback(async () => {
    if (!eventId) return;
    const res = await fetch(`/api/events/${eventId}/routes`);
    if (!res.ok) return;
    const data = await res.json();
    setEvent(data.event);
    setVans(data.vans);
    setUnassigned(data.unassigned);
    setConfirmResult(null);

    const initial: Record<string, Stop> = {};
    const originalIds = new Set<string>();
    for (const van of data.vans) {
      for (const a of van.routeAssignments) {
        initial[a.childId] = {
          childId: a.childId,
          childName: a.child.childName,
          vanId: van.id,
          stopOrder: a.stopOrder,
        };
        originalIds.add(a.childId);
      }
    }
    setAssignments(initial);
    setOriginalAssigned(originalIds);
    setSaved(false);
    // A route that's already been published (has saved assignments) opens locked,
    // so a glance doesn't risk an accidental drag/remove - editing needs an
    // explicit "Edit Routes" click. A brand-new, never-published event just opens
    // straight into editing since there's nothing to protect yet.
    setEditMode(originalIds.size === 0);
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  function stopsForVan(vanId: string): Stop[] {
    return Object.values(assignments)
      .filter((a) => a.vanId === vanId)
      .sort((a, b) => a.stopOrder - b.stopOrder);
  }

  function assignChildToVan(childId: string, childName: string, vanId: string) {
    const nextOrder = stopsForVan(vanId).length + 1;
    setAssignments((prev) => ({ ...prev, [childId]: { childId, childName, vanId, stopOrder: nextOrder } }));
    setSaved(false);
  }

  function unassignChild(childId: string) {
    setAssignments((prev) => {
      const next = { ...prev };
      delete next[childId];
      return next;
    });
    setSaved(false);
  }

  function moveStop(vanId: string, childId: string, direction: -1 | 1) {
    const stops = stopsForVan(vanId);
    const idx = stops.findIndex((s) => s.childId === childId);
    const swapIdx = idx + direction;
    if (idx < 0 || swapIdx < 0 || swapIdx >= stops.length) return;

    const reordered = [...stops];
    [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];

    setAssignments((prev) => {
      const next = { ...prev };
      reordered.forEach((s, i) => {
        next[s.childId] = { ...next[s.childId], stopOrder: i + 1 };
      });
      return next;
    });
    setSaved(false);
  }

  async function autoSortVan(vanId: string) {
    const stops = stopsForVan(vanId);
    if (stops.length < 2 || !eventId) return;

    setSortingVanId(vanId);
    setSortMessage(null);
    const res = await fetch(`/api/events/${eventId}/routes/distances`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ childIds: stops.map((s) => s.childId) }),
    });
    const data = await res.json().catch(() => ({}));
    setSortingVanId(null);

    if (!res.ok) {
      setSortMessage(data.error || "Could not sort this van's stops");
      return;
    }

    const distances: Record<string, number | null> = data.distances;
    const order: string[] = data.order;
    const unresolvedCount = stops.filter((s) => distances[s.childId] == null).length;

    // Order comes from the server as a nearest-neighbor route starting at the
    // church, so stops that are physically close to each other end up adjacent
    // in the route instead of just being ranked by distance from the church.
    const byChildId = new Map(stops.map((s) => [s.childId, s]));
    const sorted = order.map((id) => byChildId.get(id)).filter((s): s is Stop => !!s);

    setAssignments((prev) => {
      const next = { ...prev };
      sorted.forEach((s, i) => {
        next[s.childId] = { ...next[s.childId], stopOrder: i + 1 };
      });
      return next;
    });
    setSaved(false);
    setSortMessage(
      unresolvedCount > 0
        ? `Sorted, but couldn't determine the distance for ${unresolvedCount} stop${unresolvedCount === 1 ? "" : "s"} - left at the end.`
        : null
    );
  }

  async function publish() {
    if (!eventId) return;
    setSaving(true);
    const assignmentList = Object.values(assignments).map((a) => ({
      childId: a.childId,
      vanId: a.vanId,
      stopOrder: a.stopOrder,
    }));
    const unassignList = [...originalAssigned].filter((id) => !(id in assignments));

    await fetch(`/api/events/${eventId}/routes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignments: assignmentList, unassign: unassignList }),
    });
    setSaving(false);
    setSaved(true);
    load();
  }

  function cancelEdit() {
    load();
  }

  async function confirmRoutes() {
    if (!eventId) return;
    setConfirming(true);
    const res = await fetch(`/api/events/${eventId}/confirm`, { method: "POST" });
    setConfirming(false);
    if (res.ok) {
      const result = await res.json();
      // load() clears confirmResult (it's the initial-load reset), so it must run
      // before we set the result we actually want the page to show.
      await load();
      setConfirmResult(result);
    }
  }

  const unassignedRemaining = unassigned.filter((u) => !(u.childId in assignments));
  const selectedEvent = events.find((e) => e.id === eventId);
  const heading = selectedEvent
    ? `${new Date(selectedEvent.eventDate).toLocaleDateString(undefined, { month: "long", day: "numeric" })} Routes`
    : "Pickup Routes";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-900">{heading}</h1>
        <select
          className="input w-auto"
          value={eventId ?? ""}
          onChange={(e) => router.replace(`/admin/routes?eventId=${e.target.value}`)}
        >
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.eventName} &mdash; {new Date(e.eventDate).toLocaleDateString()}
            </option>
          ))}
        </select>
      </div>

      {!editMode && (
        <div className="card bg-slate-50 flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="font-semibold text-slate-700">✓ Published</p>
            <p className="text-sm text-slate-500">
              This route is locked to avoid accidental changes.
              {unassignedRemaining.length > 0 && ` ${unassignedRemaining.length} child${unassignedRemaining.length === 1 ? "" : "ren"} still unassigned.`}
            </p>
          </div>
          <button className="btn-primary" onClick={() => setEditMode(true)}>Edit Routes</button>
        </div>
      )}

      {editMode && (
        <div className="card">
          <h2 className="font-semibold mb-2">Unassigned ({unassignedRemaining.length})</h2>
          {unassignedRemaining.length === 0 ? (
            <p className="text-slate-400 text-sm">Everyone is assigned to a van.</p>
          ) : (
            <ul className="space-y-2">
              {unassignedRemaining.map((u) => (
                <li key={u.childId} className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-2 last:border-0">
                  <div>
                    <p className="font-medium">{u.childName}</p>
                    <p className="text-sm text-slate-500">
                      {u.parentName} &middot; {u.address}
                      {u.suggestedVanName && (
                        <span className="text-brand-600"> &middot; usually rides {u.suggestedVanName}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {u.suggestedVanId && (
                      <button
                        className="btn-secondary"
                        onClick={() => assignChildToVan(u.childId, u.childName, u.suggestedVanId!)}
                      >
                        Use {u.suggestedVanName} ✓
                      </button>
                    )}
                    <select
                      className="input w-auto"
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) assignChildToVan(u.childId, u.childName, e.target.value);
                      }}
                    >
                      <option value="" disabled>Assign to van...</option>
                      {vans.map((v) => (
                        <option key={v.id} value={v.id}>{v.vanName}</option>
                      ))}
                    </select>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {sortMessage && (
        <p className="text-sm text-amber-600">{sortMessage}</p>
      )}

      <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${!editMode ? "opacity-60" : ""}`}>
        {vans.map((van) => {
          const stops = stopsForVan(van.id);
          return (
            <div key={van.id} className="card">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h2 className="font-semibold">
                  {van.vanName} {van.driver ? `- ${van.driver.name}` : "(no driver)"}
                </h2>
                {editMode && stops.length > 1 && (
                  <button
                    className="btn-secondary px-2 py-1 text-xs whitespace-nowrap"
                    onClick={() => autoSortVan(van.id)}
                    disabled={sortingVanId === van.id}
                  >
                    {sortingVanId === van.id ? "Sorting..." : "Auto-Sort by Distance"}
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-400 mb-2">{stops.length} / {van.capacity} riders</p>
              {stops.length === 0 ? (
                <p className="text-slate-400 text-sm">No stops assigned.</p>
              ) : (
                <ol className="space-y-2">
                  {stops.map((s, i) => (
                    <li key={s.childId} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0">
                      <span>{i + 1}. {s.childName}</span>
                      {editMode && (
                        <div className="flex gap-1">
                          <button className="btn-secondary px-2 py-1 text-sm" onClick={() => moveStop(van.id, s.childId, -1)} disabled={i === 0}>↑</button>
                          <button className="btn-secondary px-2 py-1 text-sm" onClick={() => moveStop(van.id, s.childId, 1)} disabled={i === stops.length - 1}>↓</button>
                          <button className="btn-danger px-2 py-1 text-sm" onClick={() => unassignChild(s.childId)}>Remove</button>
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          );
        })}
      </div>

      {editMode && (
        <div className="flex items-center gap-3 flex-wrap">
          <button className="btn-primary" onClick={publish} disabled={saving}>
            {saving ? "Saving..." : originalAssigned.size > 0 ? "Update Routes" : "Publish Routes"}
          </button>
          {originalAssigned.size > 0 && (
            <button className="btn-secondary" onClick={cancelEdit} disabled={saving}>Cancel</button>
          )}
          {saved && <span className="text-emerald-600 font-medium">Routes saved ✓</span>}
        </div>
      )}

      <div className="card space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="font-semibold">Confirm Routes</h2>
            <p className="text-sm text-slate-500">
              {event?.routesConfirmedAt
                ? `Confirmed ${new Date(event.routesConfirmedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`
                : "Not yet confirmed. Review the routes above, then confirm to get each driver's link."}
            </p>
          </div>
          <button className="btn-gradient" onClick={confirmRoutes} disabled={confirming}>
            {confirming ? "Confirming..." : event?.routesConfirmedAt ? "Re-Confirm Routes" : "Confirm Routes"}
          </button>
        </div>

        {confirmResult && (
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <p className="text-sm text-slate-500">
              Drivers with an email on file were emailed their route link automatically. For
              anyone else, share the link below manually (e.g. paste into a group text) -
              automatic texting isn&apos;t set up yet.
            </p>
            {confirmResult.drivers.map((d) => (
              <div key={d.driver.id} className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-2 last:border-0">
                <div>
                  <p className="font-medium">{d.driver.name} {d.vanName && `· ${d.vanName}`}</p>
                  <p className="text-sm text-slate-500">{d.driver.phone} · {d.stopCount} stop{d.stopCount === 1 ? "" : "s"}</p>
                  {d.email.sent ? (
                    <p className="text-sm text-emerald-600">✓ Emailed {d.driver.email}</p>
                  ) : (
                    <p className="text-sm text-amber-600">
                      {d.driver.email ? `Email failed: ${d.email.error}` : "No email on file"}
                    </p>
                  )}
                </div>
                <code className="text-xs bg-slate-100 rounded px-2 py-1 break-all">
                  {typeof window !== "undefined" ? window.location.origin : ""}{d.routePath}
                </code>
              </div>
            ))}
            {confirmResult.drivers.length === 0 && (
              <p className="text-slate-400 text-sm">No drivers have stops assigned for this event yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function RoutesPage() {
  return (
    <Suspense fallback={<p className="text-slate-500">Loading...</p>}>
      <RoutesPageInner />
    </Suspense>
  );
}
