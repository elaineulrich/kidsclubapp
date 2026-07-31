import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrgTimezone, classifyDay } from "@/lib/orgTime";
import { getOrSetCache } from "@/lib/redis";
import { driverRouteListKey } from "@/lib/driverRouteCache";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "DRIVER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await getOrSetCache(driverRouteListKey(session.user.id), 8, () =>
    buildRouteList(session.user.id)
  );
  return NextResponse.json(body);
}

async function buildRouteList(driverId: string) {
  const timeZone = await getOrgTimezone();

  const assignments = await prisma.routeAssignment.findMany({
    where: { driverId },
    include: { event: true },
    orderBy: { event: { eventDate: "desc" } },
  });

  type EventTotals = {
    event: (typeof assignments)[number]["event"];
    stopCount: number;
    checkedInCount: number;
    checkedOutCount: number;
    skippedCount: number;
  };

  const byEvent = new Map<string, EventTotals>();
  for (const a of assignments) {
    const existing = byEvent.get(a.eventId) ?? {
      event: a.event,
      stopCount: 0,
      checkedInCount: 0,
      checkedOutCount: 0,
      skippedCount: 0,
    };
    existing.stopCount += 1;
    if (a.status === "PICKED_UP" || a.status === "COMPLETED") existing.checkedInCount += 1;
    if (a.status === "COMPLETED") existing.checkedOutCount += 1;
    if (a.status === "SKIPPED") existing.skippedCount += 1;
    byEvent.set(a.eventId, existing);
  }

  const routes = Array.from(byEvent.values()).map(
    ({ event, stopCount, checkedInCount, checkedOutCount, skippedCount }) => {
      const timing = classifyDay(event.eventDate, timeZone);

      return {
        eventId: event.id,
        eventName: event.eventName,
        eventDate: event.eventDate,
        startTime: event.startTime,
        endTime: event.endTime,
        stopCount,
        checkedInCount,
        checkedOutCount,
        skippedCount,
        checkInComplete: checkedInCount + skippedCount === stopCount,
        checkOutComplete: checkedInCount > 0 && checkedOutCount === checkedInCount,
        timing,
      };
    }
  );

  routes.sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());

  return {
    current: routes.filter((r) => r.timing === "current"),
    upcoming: routes.filter((r) => r.timing === "upcoming"),
    past: routes.filter((r) => r.timing === "past").reverse(),
  };
}
