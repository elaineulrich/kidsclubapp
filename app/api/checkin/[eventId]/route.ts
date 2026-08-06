import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/apiAuth";
import { applyCheckAction, routeStatusToCheckStatus, attendanceStatusToCheckStatus, CheckAction } from "@/lib/attendanceSync";

// Front-desk check-in roster: every active child (not just ones on a van route -
// plenty are dropped off directly), each with the same effective status a driver
// would see for that child if they're also on a route. Deliberately not cached -
// this is the safety-critical child check-in flow and has to reflect the moment.
export async function GET(_req: NextRequest, { params }: { params: { eventId: string } }) {
  const { error } = await requireRole(["ADMIN", "VOLUNTEER"]);
  if (error) return error;

  const event = await prisma.event.findUnique({ where: { id: params.eventId } });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const children = await prisma.child.findMany({
    where: { activeStatus: true },
    include: {
      family: true,
      routeAssignments: { where: { eventId: params.eventId }, include: { van: true, driver: true } },
      attendances: { where: { eventId: params.eventId } },
    },
    orderBy: { childName: "asc" },
  });

  const roster = children.map((child) => {
    const assignment = child.routeAssignments[0] ?? null;
    const attendance = child.attendances[0] ?? null;
    const status = assignment
      ? routeStatusToCheckStatus(assignment.status)
      : attendanceStatusToCheckStatus(attendance?.status);

    return {
      id: child.id,
      childName: child.childName,
      parentName: child.family.parentName,
      parentPhone: child.family.phone,
      age: child.age,
      medicalNotes: child.medicalNotes,
      vanId: assignment?.vanId ?? null,
      vanName: assignment?.van?.vanName ?? null,
      driverName: assignment?.driver?.name ?? null,
      driverPhone: assignment?.driver?.phone ?? null,
      status,
      checkInTime: attendance?.checkInTime ?? null,
      checkOutTime: attendance?.checkOutTime ?? null,
    };
  });

  return NextResponse.json({ event, children: roster });
}

export async function PATCH(req: NextRequest, { params }: { params: { eventId: string } }) {
  const { session, error } = await requireRole(["ADMIN", "VOLUNTEER"]);
  if (error) return error;

  const body = await req.json();
  const { childId, action } = body as { childId: string; action: CheckAction };

  if (!childId || !action) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  await applyCheckAction(params.eventId, childId, action, session!.user.id);

  return NextResponse.json({ ok: true });
}
