import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/apiAuth";
import { sendRouteEmail } from "@/lib/email";
import { getOrgTimezone } from "@/lib/orgTime";
import { getBaseUrl } from "@/lib/baseUrl";
import { cacheDel } from "@/lib/redis";
import { driverRouteListKey, driverRouteDetailKey } from "@/lib/driverRouteCache";

// Marks an event's routes as reviewed/confirmed, emails each driver with an email
// on file their route link, and returns a per-driver summary (including email
// send status) so an admin can manually share with anyone who doesn't have email
// set up - texting is a separate, deferred decision (needs an SMS provider).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const event = await prisma.event.findUnique({ where: { id: params.id } });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.event.update({
    where: { id: params.id },
    data: { routesConfirmedAt: new Date() },
  });

  const assignments = await prisma.routeAssignment.findMany({
    where: { eventId: params.id, driverId: { not: null } },
    include: { driver: true, van: true },
  });

  type DriverSummary = {
    driver: { id: string; name: string; phone: string; email: string | null };
    vanName: string | null;
    stopCount: number;
  };

  const byDriver = new Map<string, DriverSummary>();
  for (const a of assignments) {
    if (!a.driver) continue;
    const existing = byDriver.get(a.driver.id);
    if (existing) {
      existing.stopCount += 1;
    } else {
      byDriver.set(a.driver.id, {
        driver: { id: a.driver.id, name: a.driver.name, phone: a.driver.phone, email: a.driver.email },
        vanName: a.van?.vanName ?? null,
        stopCount: 1,
      });
    }
  }

  await cacheDel(
    ...Array.from(byDriver.keys()).flatMap((driverId) => [
      driverRouteListKey(driverId),
      driverRouteDetailKey(params.id, driverId),
    ])
  );

  const baseUrl = getBaseUrl(req);
  const timeZone = await getOrgTimezone();
  const eventDateLabel = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(event.eventDate);

  const drivers = await Promise.all(
    Array.from(byDriver.values()).map(async (d) => {
      const routePath = `/driver/route/${params.id}`;
      if (!d.driver.email) {
        return { ...d, routePath, email: { sent: false, error: "No email on file" } };
      }
      const email = await sendRouteEmail(
        d.driver.email,
        d.driver.name,
        event.eventName,
        eventDateLabel,
        `${baseUrl}${routePath}`
      );
      return { ...d, routePath, email };
    })
  );

  return NextResponse.json({ routesConfirmedAt: new Date().toISOString(), drivers });
}
