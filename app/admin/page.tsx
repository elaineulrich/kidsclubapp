import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOrgTimezone, todayRangeInTimezone } from "@/lib/orgTime";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const { start, end } = todayRangeInTimezone(await getOrgTimezone());

  const [familyCount, childCount, driverCount, vanCount, todaysEvent] = await Promise.all([
    prisma.family.count(),
    prisma.child.count({ where: { activeStatus: true } }),
    prisma.driver.count({ where: { activeStatus: true } }),
    prisma.van.count({ where: { activeStatus: true } }),
    prisma.event.findFirst({ where: { eventDate: { gte: start, lt: end } } }),
  ]);

  let presentCount = 0;
  let assignedCount = 0;
  if (todaysEvent) {
    [presentCount, assignedCount] = await Promise.all([
      prisma.attendance.count({ where: { eventId: todaysEvent.id, status: { in: ["PRESENT", "CHECKED_OUT"] } } }),
      prisma.routeAssignment.count({ where: { eventId: todaysEvent.id } }),
    ]);
  }

  const stats = [
    { label: "Families", value: familyCount, href: "/admin/families" },
    { label: "Active Children", value: childCount, href: "/admin/children" },
    { label: "Drivers", value: driverCount, href: "/admin/drivers" },
    { label: "Vans", value: vanCount, href: "/admin/vans" },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card hover:shadow-md transition">
            <p className="text-3xl font-bold text-brand-600">{s.value}</p>
            <p className="text-sm text-slate-500">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-2">Today&apos;s Event</h2>
        {todaysEvent ? (
          <div className="space-y-1 text-slate-700">
            <p className="font-medium">
              {todaysEvent.eventName} &mdash;{" "}
              {new Date(todaysEvent.eventDate).toLocaleDateString(undefined, {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
            <p>
              {todaysEvent.startTime} &ndash; {todaysEvent.endTime}
            </p>
            <p>{presentCount} checked in &middot; {assignedCount} riders assigned to routes</p>
            <div className="flex flex-wrap gap-3 mt-3">
              <Link href="/checkin" className="btn-primary">Go to Check-In</Link>
              <Link href="/admin/routes" className="btn-secondary">Manage Routes</Link>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-slate-500 mb-3">No event scheduled for today.</p>
            <Link href="/admin/events" className="btn-primary">Create an Event</Link>
          </div>
        )}
      </div>
    </div>
  );
}
