import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/apiAuth";
import { getOrgTimezone, classifyDay } from "@/lib/orgTime";

// Lists events for the check-in event picker, grouped the same way the driver
// route list is (current/upcoming/past), with rough headcounts. Attendance is kept
// in sync with RouteAssignment by applyCheckAction, so counting Attendance alone
// (regardless of whether a child rides a van) is enough here - no need to also
// join RouteAssignment just to get an accurate number.
export async function GET() {
  const { error } = await requireRole(["ADMIN", "VOLUNTEER"]);
  if (error) return error;

  const timeZone = await getOrgTimezone();

  const events = await prisma.event.findMany({ orderBy: { eventDate: "desc" } });
  const attendanceCounts = await prisma.attendance.groupBy({
    by: ["eventId", "status"],
    _count: true,
    where: { eventId: { in: events.map((e) => e.id) } },
  });

  const countsByEvent = new Map<string, { checkedIn: number; checkedOut: number }>();
  for (const row of attendanceCounts) {
    const existing = countsByEvent.get(row.eventId) ?? { checkedIn: 0, checkedOut: 0 };
    // checkedIn is cumulative (anyone who was ever checked in, including those now
    // checked out too) so it matches how the driver route list counts its stops.
    if (row.status === "PRESENT" || row.status === "CHECKED_OUT") existing.checkedIn += row._count;
    if (row.status === "CHECKED_OUT") existing.checkedOut += row._count;
    countsByEvent.set(row.eventId, existing);
  }

  const results = events.map((event) => {
    const counts = countsByEvent.get(event.id) ?? { checkedIn: 0, checkedOut: 0 };
    return {
      id: event.id,
      eventName: event.eventName,
      eventDate: event.eventDate,
      startTime: event.startTime,
      endTime: event.endTime,
      checkedInCount: counts.checkedIn,
      checkedOutCount: counts.checkedOut,
      timing: classifyDay(event.eventDate, timeZone),
    };
  });

  return NextResponse.json({
    current: results.filter((r) => r.timing === "current"),
    upcoming: results.filter((r) => r.timing === "upcoming").reverse(),
    past: results.filter((r) => r.timing === "past"),
  });
}
