"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import SignOutButton from "@/components/SignOutButton";
import DriverAdminSwitchLink from "@/components/DriverAdminSwitchLink";

type RouteSummary = {
  eventId: string;
  eventName: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  stopCount: number;
  checkedInCount: number;
  checkedOutCount: number;
  skippedCount: number;
  checkInComplete: boolean;
  checkOutComplete: boolean;
  timing: "current" | "upcoming" | "past";
};

type RoutesData = {
  current: RouteSummary[];
  upcoming: RouteSummary[];
  past: RouteSummary[];
};

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function RouteCard({ r }: { r: RouteSummary }) {
  const isCurrent = r.timing === "current";
  const checkInDone = isCurrent && r.checkInComplete;
  const checkOutDone = isCurrent && r.checkOutComplete;

  return (
    <div className="card space-y-2">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-lg">{r.eventName}</p>
        <span className="text-sm text-slate-400">{formatDate(r.eventDate)}</span>
      </div>
      <p className="text-slate-500 text-sm">
        {r.startTime}–{r.endTime} · {r.stopCount} stop{r.stopCount === 1 ? "" : "s"}
        {r.timing !== "upcoming" && ` · ${r.checkedInCount}/${r.stopCount} checked in`}
      </p>

      {checkOutDone ? (
        <p className="text-sm font-bold text-emerald-600">🎉 Check-Out Route Completed!</p>
      ) : checkInDone ? (
        <p className="text-sm font-bold text-emerald-600">✓ Check-In Route Completed - start Check-Out when ready</p>
      ) : null}

      <div className="flex gap-2 pt-1">
        {isCurrent ? (
          <>
            <Link
              href={`/driver/route/${r.eventId}?mode=checkin`}
              className={checkInDone ? "btn-secondary flex-1 text-center opacity-50" : "btn-primary flex-1 text-center"}
            >
              {checkInDone ? "✓ Checked In" : "Check-In Route"}
            </Link>
            <Link
              href={`/driver/route/${r.eventId}?mode=checkout`}
              className={
                checkOutDone
                  ? "btn-secondary flex-1 text-center opacity-50"
                  : checkInDone
                  ? "btn-gradient flex-1 text-center"
                  : "btn-secondary flex-1 text-center"
              }
            >
              {checkOutDone ? "✓ Checked Out" : "Check-Out Route"}
            </Link>
          </>
        ) : (
          <Link href={`/driver/route/${r.eventId}`} className="btn-secondary flex-1 text-center">
            Review Route
          </Link>
        )}
      </div>
    </div>
  );
}

export default function DriverRoutesPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<RoutesData | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/driver/route");
    if (res.ok) setData(await res.json());
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Loading routes...</p>
      </main>
    );
  }

  const hasAnyRoutes = data.current.length + data.upcoming.length + data.past.length > 0;

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-4">
      <div className="max-w-md mx-auto space-y-4">
        <Image src="/logo.png" alt="Haven Kids Club" width={140} height={57} className="mx-auto" priority />

        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900">
            {greeting()}{session?.user?.name ? `, ${session.user.name.split(" ")[0]}` : ""}!
          </h1>
          <div className="flex items-center gap-3">
            <DriverAdminSwitchLink />
            <SignOutButton />
          </div>
        </div>

        {!hasAnyRoutes && <p className="text-slate-500">You have no routes assigned.</p>}

        {data.current.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Today</h2>
            {data.current.map((r) => <RouteCard key={r.eventId} r={r} />)}
          </section>
        )}

        {data.upcoming.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Upcoming</h2>
            {data.upcoming.map((r) => <RouteCard key={r.eventId} r={r} />)}
          </section>
        )}

        {data.past.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Past</h2>
            {data.past.map((r) => <RouteCard key={r.eventId} r={r} />)}
          </section>
        )}
      </div>
    </main>
  );
}
