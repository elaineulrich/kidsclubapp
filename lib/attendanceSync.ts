import { prisma } from "@/lib/prisma";
import { cacheDel } from "@/lib/redis";
import { driverRouteListKey, driverRouteDetailKey } from "@/lib/driverRouteCache";

export type CheckAction = "in" | "out" | "skip" | "undo";

const ROUTE_STATUS_BY_ACTION = {
  in: "PICKED_UP",
  out: "COMPLETED",
  skip: "SKIPPED",
  undo: "ASSIGNED",
} as const;

/// Effective check status for a child at an event, unifying two possible sources:
/// their RouteAssignment (if a driver's van covers them) or their Attendance record
/// (everyone else - walk-ins, kids dropped off directly). Front-desk and driver
/// views both derive this so either surface always agrees with the other.
export type CheckStatus = "NOT_YET" | "CHECKED_IN" | "CHECKED_OUT" | "SKIPPED";

export function routeStatusToCheckStatus(status: string): CheckStatus {
  if (status === "PICKED_UP") return "CHECKED_IN";
  if (status === "COMPLETED") return "CHECKED_OUT";
  if (status === "SKIPPED") return "SKIPPED";
  return "NOT_YET";
}

export function attendanceStatusToCheckStatus(status: string | undefined): CheckStatus {
  if (status === "PRESENT") return "CHECKED_IN";
  if (status === "CHECKED_OUT") return "CHECKED_OUT";
  if (status === "ABSENT") return "SKIPPED";
  return "NOT_YET";
}

/// Applies a check-in / check-out / not-coming-today / undo action for one child at
/// one event. Whether the action comes from a driver working their route or a
/// front-desk volunteer/admin working the check-in list, this is the single place
/// that writes it, so the two views can never drift apart. When the child has a
/// RouteAssignment for this event, that record is the source of truth (and its
/// driver's cached route is invalidated); the shared Attendance record is always
/// kept in sync too, since it's also what the attendance reports read.
export async function applyCheckAction(
  eventId: string,
  childId: string,
  action: CheckAction,
  checkedByUserId?: string
) {
  const assignment = await prisma.routeAssignment.findUnique({
    where: { eventId_childId: { eventId, childId } },
  });

  let updatedAssignment = assignment;
  if (assignment) {
    updatedAssignment = await prisma.routeAssignment.update({
      where: { id: assignment.id },
      data: { status: ROUTE_STATUS_BY_ACTION[action] },
    });
    if (assignment.driverId) {
      await cacheDel(driverRouteListKey(assignment.driverId), driverRouteDetailKey(eventId, assignment.driverId));
    }
  }

  const now = new Date();
  const byline = checkedByUserId ? { checkedById: checkedByUserId } : {};

  if (action === "in") {
    await prisma.attendance.upsert({
      where: { eventId_childId: { eventId, childId } },
      create: { eventId, childId, checkInTime: now, status: "PRESENT", ...byline },
      update: { checkInTime: now, checkOutTime: null, status: "PRESENT", ...byline },
    });
  } else if (action === "out") {
    await prisma.attendance.upsert({
      where: { eventId_childId: { eventId, childId } },
      create: { eventId, childId, checkOutTime: now, status: "CHECKED_OUT", ...byline },
      update: { checkOutTime: now, status: "CHECKED_OUT", ...byline },
    });
  } else if (action === "skip") {
    await prisma.attendance.upsert({
      where: { eventId_childId: { eventId, childId } },
      create: { eventId, childId, status: "ABSENT", ...byline },
      update: { checkInTime: null, checkOutTime: null, status: "ABSENT", ...byline },
    });
  } else {
    await prisma.attendance.deleteMany({ where: { eventId, childId } });
  }

  return { assignment: updatedAssignment };
}
