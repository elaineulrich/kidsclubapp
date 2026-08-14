import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/apiAuth";
import { sendSms, toE164 } from "@/lib/sms";
import { getOrgTimezone } from "@/lib/orgTime";
import { getBaseUrl } from "@/lib/baseUrl";

// Texts every opted-in driver with a stop on this event a link to their route.
// Admin-triggered (not automatic) - same reasoning as the family reminder button:
// texting is new enough that a human should decide when the first one goes out,
// and repeat sends are a deliberate re-click, not something that fires on its own.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const event = await prisma.event.findUnique({ where: { id: params.id } });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const assignments = await prisma.routeAssignment.findMany({
    where: { eventId: params.id, driverId: { not: null } },
    include: { driver: true },
  });

  const driversById = new Map<string, NonNullable<(typeof assignments)[number]["driver"]>>();
  for (const a of assignments) {
    if (a.driver) driversById.set(a.driver.id, a.driver);
  }

  const timeZone = await getOrgTimezone();
  const eventDateLabel = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(event.eventDate);

  const baseUrl = getBaseUrl(req);
  const routeUrl = `${baseUrl}/driver/route/${params.id}`;
  const message = `Haven Kids Club: your ${event.eventName} route (${eventDateLabel}) is ready: ${routeUrl} Reply STOP to opt out.`;

  const results = await Promise.all(
    Array.from(driversById.values()).map(async (driver) => {
      const base = { driverId: driver.id, driverName: driver.name };
      if (!driver.smsOptIn) {
        return { ...base, sent: false, skipped: true, error: "Not opted in" };
      }
      const to = toE164(driver.phone);
      if (!to) {
        return { ...base, sent: false, skipped: false, error: "Invalid phone number" };
      }
      const result = await sendSms(to, message);
      return { ...base, skipped: false, ...result };
    })
  );

  const sentCount = results.filter((r) => r.sent).length;
  const skippedCount = results.filter((r) => r.skipped).length;
  const failedCount = results.filter((r) => !r.sent && !r.skipped).length;

  return NextResponse.json({ sentCount, skippedCount, failedCount, results });
}
