"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import SignOutButton from "@/components/SignOutButton";

type EventSummary = {
  id: string;
  eventName: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  checkedInCount: number;
  checkedOutCount: number;
  timing: "current" | "upcoming" | "past";
};

type EventsData = {
  current: EventSummary[];
  upcoming: EventSummary[];
  past: EventSummary[];
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function EventCard({ e }: { e: EventSummary }) {
  return (
    <Link href={`/checkin/${e.id}`} className="card block space-y-1 hover:shadow-md transition">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-lg">{e.eventName}</p>
        <span className="text-sm text-slate-400">{formatDate(e.eventDate)}</span>
      </div>
      <p className="text-slate-500 text-sm">
        {e.startTime}–{e.endTime}
        {e.timing !== "upcoming" && ` · ${e.checkedInCount} checked in · ${e.checkedOutCount} checked out`}
      </p>
    </Link>
  );
}

export default function CheckInEventsPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<EventsData | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/checkin/events");
    if (res.ok) setData(await res.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Loading events...</p>
      </main>
    );
  }

  const hasAnyEvents = data.current.length + data.upcoming.length + data.past.length > 0;

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-4">
      <div className="max-w-md mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Image src="/logo.png" alt="Haven Kids Club" width={104} height={42} className="mb-1" priority />
            <h1 className="text-xl font-bold text-slate-900">Check-In</h1>
          </div>
          <div className="flex items-center gap-3">
            {session?.user.role === "ADMIN" && (
              <Link href="/admin" className="text-sm font-medium text-brand-600">Admin</Link>
            )}
            <SignOutButton />
          </div>
        </div>

        {!hasAnyEvents && <p className="text-slate-500">No events scheduled yet.</p>}

        {data.current.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Today</h2>
            {data.current.map((e) => <EventCard key={e.id} e={e} />)}
          </section>
        )}

        {data.upcoming.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Upcoming</h2>
            {data.upcoming.map((e) => <EventCard key={e.id} e={e} />)}
          </section>
        )}

        {data.past.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Past</h2>
            {data.past.map((e) => <EventCard key={e.id} e={e} />)}
          </section>
        )}
      </div>
    </main>
  );
}
