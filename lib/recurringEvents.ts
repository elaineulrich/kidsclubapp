import { prisma } from "@/lib/prisma";
import { Recurrence } from "@prisma/client";
import { getOrgTimezone, classifyDay } from "@/lib/orgTime";
import { cacheDel } from "@/lib/redis";
import { driverRouteListKey, driverRouteDetailKey } from "@/lib/driverRouteCache";

// Assigns every active, pickup-required child who has a default van set to that van
// for this event, unless they already have an assignment (e.g. an admin manually
// placed them somewhere already). Driver is derived from the van's current driver.
export async function populateDefaultRoutesForEvent(eventId: string) {
  const children = await prisma.child.findMany({
    where: { activeStatus: true, pickupRequired: true, defaultVanId: { not: null } },
    include: {
      defaultVan: true,
      routeAssignments: { where: { eventId } },
    },
  });

  const stopOrderByVan = new Map<string, number>();
  const existingAssignments = await prisma.routeAssignment.findMany({
    where: { eventId, vanId: { not: null } },
    select: { vanId: true, stopOrder: true },
  });
  for (const a of existingAssignments) {
    if (!a.vanId) continue;
    stopOrderByVan.set(a.vanId, Math.max(stopOrderByVan.get(a.vanId) ?? 0, a.stopOrder));
  }

  for (const child of children) {
    if (child.routeAssignments.length > 0) continue;
    if (!child.defaultVanId || !child.defaultVan) continue;

    const nextOrder = (stopOrderByVan.get(child.defaultVanId) ?? 0) + 1;
    stopOrderByVan.set(child.defaultVanId, nextOrder);

    await prisma.routeAssignment.create({
      data: {
        eventId,
        childId: child.id,
        vanId: child.defaultVanId,
        driverId: child.defaultVan.driverId,
        stopOrder: nextOrder,
        status: "ASSIGNED",
      },
    });

    if (child.defaultVan.driverId) await cacheDel(driverRouteListKey(child.defaultVan.driverId));
  }
}

// When a child's default van changes, moves them to the new van in any event that's
// today or upcoming and hasn't been confirmed yet - so the change is visible on
// routes already generated, not just future events created after this point. Past
// events, confirmed events, and stops the child/driver has already acted on
// (picked up, marked not coming) are left alone.
export async function syncChildToNewDefaultVan(childId: string, newVanId: string) {
  const timeZone = await getOrgTimezone();

  const assignments = await prisma.routeAssignment.findMany({
    where: { childId, status: "ASSIGNED", vanId: { not: newVanId } },
    include: { event: true },
  });

  const newVan = await prisma.van.findUnique({ where: { id: newVanId } });
  if (!newVan) return;

  for (const a of assignments) {
    if (a.event.routesConfirmedAt) continue;
    if (classifyDay(a.event.eventDate, timeZone) === "past") continue;

    const maxOrder = await prisma.routeAssignment.aggregate({
      where: { eventId: a.eventId, vanId: newVanId },
      _max: { stopOrder: true },
    });

    await prisma.routeAssignment.update({
      where: { id: a.id },
      data: {
        vanId: newVanId,
        driverId: newVan.driverId,
        stopOrder: (maxOrder._max.stopOrder ?? 0) + 1,
      },
    });

    const staleDriverIds = new Set([a.driverId, newVan.driverId].filter((id): id is string => !!id));
    await cacheDel(
      ...Array.from(staleDriverIds).flatMap((driverId) => [
        driverRouteListKey(driverId),
        driverRouteDetailKey(a.eventId, driverId),
      ])
    );
  }
}

function addDaysUtc(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function nextOccurrenceDate(eventDate: Date, recurrence: Recurrence): Date {
  const days = recurrence === "WEEKLY" ? 7 : 14;
  return addDaysUtc(eventDate, days);
}

// Ensures every active recurring series has at least one upcoming (or today's)
// occurrence on the calendar - generating the next one, with default routes
// pre-populated, if the latest existing occurrence has already passed.
export async function ensureUpcomingOccurrences() {
  const recurringEvents = await prisma.event.findMany({
    where: { recurrence: { not: "NONE" } },
    orderBy: { eventDate: "desc" },
  });

  const latestBySeries = new Map<string, (typeof recurringEvents)[number]>();
  for (const event of recurringEvents) {
    const rootId = event.seriesId ?? event.id;
    if (!latestBySeries.has(rootId)) {
      latestBySeries.set(rootId, event);
    }
  }

  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  for (const [rootId, latest] of latestBySeries) {
    let current = latest;

    // Loop rather than generating a single step, so a series that's gone
    // unattended for several occurrences (e.g. the app wasn't opened for a
    // month) catches all the way up in one pass instead of one per page load.
    while (true) {
      const currentDate = new Date(current.eventDate);
      currentDate.setUTCHours(0, 0, 0, 0);
      if (currentDate >= startOfToday) break;

      const newEvent = await prisma.event.create({
        data: {
          eventName: current.eventName,
          eventDate: nextOccurrenceDate(current.eventDate, current.recurrence),
          startTime: current.startTime,
          endTime: current.endTime,
          recurrence: current.recurrence,
          seriesId: rootId,
        },
      });

      await populateDefaultRoutesForEvent(newEvent.id);
      current = newEvent;
    }
  }
}
