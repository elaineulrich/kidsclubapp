import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/apiAuth";
import { getOrSetCache } from "@/lib/redis";

export async function GET(req: NextRequest) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const eventId = req.nextUrl.searchParams.get("eventId");

  const body = await getOrSetCache(`report:transportation:${eventId ?? "latest"}`, 30, () =>
    buildTransportationReport(eventId)
  );
  return NextResponse.json(body);
}

async function buildTransportationReport(eventId: string | null) {
  const event = eventId
    ? await prisma.event.findUnique({ where: { id: eventId } })
    : await prisma.event.findFirst({ orderBy: { eventDate: "desc" } });

  if (!event) return { event: null, vans: [], totalRiders: 0 };

  const vans = await prisma.van.findMany({
    include: {
      driver: true,
      routeAssignments: {
        where: { eventId: event.id },
        include: { child: true },
        orderBy: { stopOrder: "asc" },
      },
    },
    orderBy: { vanName: "asc" },
  });

  const totalRiders = vans.reduce((sum, v) => sum + v.routeAssignments.length, 0);

  return {
    event,
    totalRiders,
    vans: vans.map((v) => ({
      id: v.id,
      vanName: v.vanName,
      capacity: v.capacity,
      driverName: v.driver?.name ?? "Unassigned",
      riders: v.routeAssignments.map((a) => ({
        childName: a.child.childName,
        stopOrder: a.stopOrder,
        status: a.status,
      })),
    })),
  };
}
