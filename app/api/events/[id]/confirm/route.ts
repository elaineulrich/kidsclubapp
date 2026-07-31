import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/apiAuth";

// Marks an event's routes as reviewed/confirmed, and returns a per-driver summary
// (name, phone, stop count, and the path to their route) for sharing - e.g. pasting
// into a group text - until real SMS sending is wired up.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
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

  const byDriver = new Map<string, { driver: { id: string; name: string; phone: string }; vanName: string | null; stopCount: number }>();
  for (const a of assignments) {
    if (!a.driver) continue;
    const existing = byDriver.get(a.driver.id);
    if (existing) {
      existing.stopCount += 1;
    } else {
      byDriver.set(a.driver.id, {
        driver: { id: a.driver.id, name: a.driver.name, phone: a.driver.phone },
        vanName: a.van?.vanName ?? null,
        stopCount: 1,
      });
    }
  }

  const drivers = Array.from(byDriver.values()).map((d) => ({
    ...d,
    routePath: `/driver/route/${params.id}`,
  }));

  return NextResponse.json({ routesConfirmedAt: new Date().toISOString(), drivers });
}
