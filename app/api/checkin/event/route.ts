import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/apiAuth";

// Returns the event happening today (or the most recently created one today),
// used as the default context for the check-in dashboard.
export async function GET() {
  const { error } = await requireRole(["ADMIN", "VOLUNTEER"]);
  if (error) return error;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const event = await prisma.event.findFirst({
    where: { eventDate: { gte: startOfToday, lt: endOfToday } },
    orderBy: { startTime: "desc" },
  });

  return NextResponse.json({ event });
}
