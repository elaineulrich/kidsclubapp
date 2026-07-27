"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import SignOutButton from "@/components/SignOutButton";

type SearchResult = {
  id: string;
  childName: string;
  grade: string | null;
  medicalNotes: string | null;
  parentName: string;
  parentPhone: string;
  attendance: { status: string; checkInTime: string | null; checkOutTime: string | null } | null;
};

type TodayEvent = { id: string; eventName: string; eventDate: string } | null;

export default function CheckInPage() {
  const { data: session } = useSession();
  const [event, setEvent] = useState<TodayEvent>(null);
  const [eventLoaded, setEventLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [confirmation, setConfirmation] = useState<{ name: string; time: string; action: "in" | "out" } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/checkin/event")
      .then((r) => r.json())
      .then((d) => setEvent(d.event))
      .finally(() => setEventLoaded(true));
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      const params = new URLSearchParams({ q: query });
      if (event) params.set("eventId", event.id);
      const res = await fetch(`/api/checkin/search?${params.toString()}`);
      if (res.ok) setResults(await res.json());
    }, 250);
    return () => clearTimeout(handle);
  }, [query, event]);

  async function doAction(action: "in" | "out") {
    if (!selected || !event) return;
    setBusy(true);
    const res = await fetch("/api/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ childId: selected.id, eventId: event.id, action }),
    });
    setBusy(false);
    if (res.ok) {
      const time = new Date().toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
      setConfirmation({ name: selected.childName, time, action });
      setSelected(null);
      setQuery("");
      setResults([]);
    }
  }

  if (eventLoaded && !event) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <h1 className="text-xl font-bold mb-2">No Event Today</h1>
          <p className="text-slate-500 mb-4">There is no Kids Club event scheduled for today. Ask an admin to create one.</p>
          <SignOutButton />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Kids Club Check-In</h1>
            {event && <p className="text-sm text-slate-500">{event.eventName}</p>}
          </div>
          <div className="flex items-center gap-3">
            {session?.user.role === "ADMIN" && (
              <Link href="/admin" className="text-sm font-medium text-brand-600">Admin</Link>
            )}
            <SignOutButton />
          </div>
        </div>

        {confirmation && (
          <div className="card bg-emerald-50 border-emerald-200 mb-4 text-center">
            <p className="text-2xl">✓ {confirmation.name} checked {confirmation.action === "in" ? "in" : "out"}</p>
            <p className="text-slate-600 mt-1">Time: {confirmation.time}</p>
            <p className="text-slate-600">Checked {confirmation.action === "in" ? "in" : "out"} by: {session?.user.name}</p>
            <button className="btn-secondary mt-3" onClick={() => setConfirmation(null)}>Check In Another Child</button>
          </div>
        )}

        {!confirmation && !selected && (
          <>
            <input
              autoFocus
              className="input mb-3"
              placeholder="Search child name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="space-y-2">
              {results.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className="card w-full text-left hover:shadow-md transition"
                >
                  <p className="font-semibold text-lg">{r.childName}</p>
                  <p className="text-sm text-slate-500">Parent: {r.parentName}</p>
                  {r.attendance?.checkInTime && !r.attendance.checkOutTime && (
                    <p className="text-sm text-emerald-600 font-medium">Currently checked in</p>
                  )}
                  {r.attendance?.checkOutTime && (
                    <p className="text-sm text-slate-400">Checked out</p>
                  )}
                </button>
              ))}
              {query && results.length === 0 && (
                <p className="text-slate-400 text-center mt-4">No matching children found.</p>
              )}
            </div>
          </>
        )}

        {!confirmation && selected && (
          <div className="card text-center space-y-3">
            <div>
              <p className="text-2xl font-bold">{selected.childName}</p>
              <p className="text-slate-500">Parent: {selected.parentName}</p>
              <p className="text-slate-500">{selected.parentPhone}</p>
              {selected.grade && <p className="text-slate-500">Grade: {selected.grade}</p>}
              {selected.medicalNotes && (
                <p className="text-red-600 font-medium mt-2">⚠ {selected.medicalNotes}</p>
              )}
            </div>

            {selected.attendance?.checkInTime && !selected.attendance.checkOutTime ? (
              <button className="btn-danger w-full" disabled={busy} onClick={() => doAction("out")}>
                CHECK OUT
              </button>
            ) : (
              <button className="btn-success w-full" disabled={busy} onClick={() => doAction("in")}>
                CHECK IN
              </button>
            )}

            <button className="btn-secondary w-full" onClick={() => setSelected(null)}>
              Back to Search
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
