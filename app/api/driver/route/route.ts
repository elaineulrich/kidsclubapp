import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fullRouteUrl } from "@/lib/maps";
import { getOrgTimezone, classifyDay } from "@/lib/orgTime";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "DRIVER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const timeZone = await getOrgTimezone();

  const assignments = await prisma.routeAssignment.findMany({
    where: { driverId: session.user.id },
    include: { event: true },
    orderBy: { event: { eventDate: "desc" } },
  });

  const byEvent = new Map<string, { event: (typeof assignments)[number]["event"]; stopCount: number; pickedUpCount: number }>();
  for (const a of assignments) {
    const existing = byEvent.get(a.eventId);
    const pickedUp = a.status === "PICKED_UP" || a.status === "COMPLETED" ? 1 : 0;
    if (existing) {
      existing.stopCount += 1;
      existing.pickedUpCount += pickedUp;
    } else {
      byEvent.set(a.eventId, { event: a.event, stopCount: 1, pickedUpCount: pickedUp });
    }
  }

  const routes = Array.from(byEvent.values()).map(({ event, stopCount, pickedUpCount }) => {
    const timing = classifyDay(event.eventDate, timeZone);

    return {
      eventId: event.id,
      eventName: event.eventName,
      eventDate: event.eventDate,
      startTime: event.startTime,
      endTime: event.endTime,
      stopCount,
      pickedUpCount,
      timing,
    };
  });

  routes.sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());

  const current = routes.filter((r) => r.timing === "current");

  const currentWithStartUrl = await Promise.all(
    current.map(async (r) => {
      const stops = await prisma.routeAssignment.findMany({
        where: { eventId: r.eventId, driverId: session.user.id },
        orderBy: { stopOrder: "asc" },
        include: { child: { include: { family: true } } },
      });
      const addresses = stops.map(
        (s) => `${s.child.family.address}, ${s.child.family.city}, ${s.child.family.state} ${s.child.family.zip}`
      );
      return { ...r, startUrl: fullRouteUrl(process.env.CHURCH_ADDRESS ?? "", addresses) };
    })
  );

  return NextResponse.json({
    current: currentWithStartUrl,
    upcoming: routes.filter((r) => r.timing === "upcoming"),
    past: routes.filter((r) => r.timing === "past").reverse(),
  });
}
