import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/apiAuth";
import { getOrgTimezone, todayRangeInTimezone } from "@/lib/orgTime";

// Returns the event happening today (or the most recently created one today),
// used as the default context for the check-in dashboard.
export async function GET() {
  const { error } = await requireRole(["ADMIN", "VOLUNTEER"]);
  if (error) return error;

  const { start, end } = todayRangeInTimezone(await getOrgTimezone());

  const event = await prisma.event.findFirst({
    where: { eventDate: { gte: start, lt: end } },
    orderBy: { startTime: "desc" },
  });

  return NextResponse.json({ event });
}
