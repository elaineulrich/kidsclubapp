import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrgTimezone, classifyDay } from "@/lib/orgTime";

export async function GET(_req: NextRequest, { params }: { params: { eventId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "DRIVER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const event = await prisma.event.findUnique({ where: { id: params.eventId } });
  const driver = await prisma.driver.findUnique({ where: { id: session.user.id } });

  if (!event || !driver) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const assignments = await prisma.routeAssignment.findMany({
    where: { eventId: event.id, driverId: driver.id },
    orderBy: { stopOrder: "asc" },
    include: { child: { include: { family: true } }, van: true },
  });

  if (assignments.length === 0) {
    return NextResponse.json({ error: "No route assigned to you for this event" }, { status: 404 });
  }

  const stops = assignments.map((a) => ({
    id: a.id,
    stopOrder: a.stopOrder,
    status: a.status,
    childId: a.childId,
    childName: a.child.childName,
    parentName: a.child.family.parentName,
    address: `${a.child.family.address}, ${a.child.family.city}, ${a.child.family.state} ${a.child.family.zip}`,
    pickupNotes: a.child.pickupNotes,
    vanName: a.van?.vanName ?? null,
  }));

  const timeZone = await getOrgTimezone();
  const timing = classifyDay(event.eventDate, timeZone);

  return NextResponse.json({
    event,
    driver: { id: driver.id, name: driver.name },
    stops,
    timing,
    churchAddress: process.env.CHURCH_ADDRESS ?? "",
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { eventId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "DRIVER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { assignmentId, status } = body as { assignmentId: string; status: "PICKED_UP" | "COMPLETED" };

  const assignment = await prisma.routeAssignment.findUnique({ where: { id: assignmentId } });
  if (!assignment || assignment.driverId !== session.user.id || assignment.eventId !== params.eventId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.routeAssignment.update({
    where: { id: assignmentId },
    data: { status },
  });

  return NextResponse.json(updated);
}
