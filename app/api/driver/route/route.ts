import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "DRIVER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const event = await prisma.event.findFirst({
    where: { eventDate: { gte: startOfToday, lt: endOfToday } },
    orderBy: { startTime: "desc" },
  });

  const driver = await prisma.driver.findUnique({ where: { id: session.user.id } });

  if (!event || !driver) {
    return NextResponse.json({ event: null, driver, stops: [] });
  }

  const assignments = await prisma.routeAssignment.findMany({
    where: { eventId: event.id, driverId: driver.id },
    orderBy: { stopOrder: "asc" },
    include: { child: { include: { family: true } }, van: true },
  });

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

  return NextResponse.json({
    event,
    driver: { id: driver.id, name: driver.name },
    stops,
    churchAddress: process.env.CHURCH_ADDRESS ?? "",
  });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "DRIVER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { assignmentId, status } = body as { assignmentId: string; status: "PICKED_UP" | "COMPLETED" };

  const assignment = await prisma.routeAssignment.findUnique({ where: { id: assignmentId } });
  if (!assignment || assignment.driverId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.routeAssignment.update({
    where: { id: assignmentId },
    data: { status },
  });

  return NextResponse.json(updated);
}
