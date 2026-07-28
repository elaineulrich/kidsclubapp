import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/apiAuth";

export async function GET(req: NextRequest) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const eventId = req.nextUrl.searchParams.get("eventId");

  const events = await prisma.event.findMany({ orderBy: { eventDate: "desc" } });
  const totalEvents = eventId ? 1 : events.length;

  const children = await prisma.child.findMany({
    where: { activeStatus: true },
    include: {
      family: true,
      attendances: {
        where: eventId ? { eventId } : undefined,
        include: { event: true },
        orderBy: { event: { eventDate: "desc" } },
      },
    },
    orderBy: { childName: "asc" },
  });

  const report = children.map((child) => {
    const presentCount = child.attendances.filter(
      (a) => a.status === "PRESENT" || a.status === "CHECKED_OUT"
    ).length;

    return {
      childId: child.id,
      childName: child.childName,
      parentName: child.family.parentName,
      totalEvents,
      presentCount,
      percentage: totalEvents > 0 ? Math.round((presentCount / totalEvents) * 100) : 0,
      records: child.attendances.map((a) => ({
        eventId: a.eventId,
        eventName: a.event.eventName,
        eventDate: a.event.eventDate,
        status: a.status,
        checkInTime: a.checkInTime,
        checkOutTime: a.checkOutTime,
      })),
    };
  });

  return NextResponse.json({ events, report });
}
