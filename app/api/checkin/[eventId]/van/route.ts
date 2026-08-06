import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/apiAuth";
import { cacheDel } from "@/lib/redis";
import { driverRouteListKey, driverRouteDetailKey } from "@/lib/driverRouteCache";
import { attendanceStatusToCheckStatus, CheckStatus } from "@/lib/attendanceSync";
import { RouteStatus } from "@prisma/client";

function checkStatusToRouteStatus(status: CheckStatus): RouteStatus {
  if (status === "CHECKED_IN") return "PICKED_UP";
  if (status === "CHECKED_OUT") return "COMPLETED";
  if (status === "SKIPPED") return "SKIPPED";
  return "ASSIGNED";
}

// Admin-only: move a child to a different van/route for this event, e.g. a
// last-minute change to who's driving them home at checkout. Passing vanId: null
// unassigns them from any route. Leaves an existing assignment's status alone;
// a brand-new one is seeded from the child's current attendance so switching a
// walk-in onto a route doesn't reset their check-in/out state.
export async function PATCH(req: NextRequest, { params }: { params: { eventId: string } }) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const body = await req.json();
  const { childId, vanId } = body as { childId: string; vanId: string | null };
  if (!childId) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

  const existing = await prisma.routeAssignment.findUnique({
    where: { eventId_childId: { eventId: params.eventId, childId } },
  });

  const affectedDriverIds = new Set<string>();
  if (existing?.driverId) affectedDriverIds.add(existing.driverId);

  if (!vanId) {
    if (existing) {
      await prisma.routeAssignment.delete({ where: { id: existing.id } });
    }
  } else {
    const van = await prisma.van.findUnique({ where: { id: vanId } });
    if (!van) return NextResponse.json({ error: "Van not found" }, { status: 404 });

    if (existing) {
      await prisma.routeAssignment.update({
        where: { id: existing.id },
        data: { vanId, driverId: van.driverId },
      });
    } else {
      const [attendance, stopCount] = await Promise.all([
        prisma.attendance.findUnique({ where: { eventId_childId: { eventId: params.eventId, childId } } }),
        prisma.routeAssignment.count({ where: { eventId: params.eventId, vanId } }),
      ]);
      await prisma.routeAssignment.create({
        data: {
          eventId: params.eventId,
          childId,
          vanId,
          driverId: van.driverId,
          stopOrder: stopCount + 1,
          status: checkStatusToRouteStatus(attendanceStatusToCheckStatus(attendance?.status)),
        },
      });
    }
    if (van.driverId) affectedDriverIds.add(van.driverId);
  }

  await cacheDel(
    ...Array.from(affectedDriverIds).flatMap((driverId) => [
      driverRouteListKey(driverId),
      driverRouteDetailKey(params.eventId, driverId),
    ])
  );

  return NextResponse.json({ ok: true });
}
