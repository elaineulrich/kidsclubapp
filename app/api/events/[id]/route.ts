import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/apiAuth";
import { getOrgTimezone, zonedMidnightUtc } from "@/lib/orgTime";
import { Recurrence } from "@prisma/client";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireRole(["ADMIN", "VOLUNTEER", "DRIVER"]);
  if (error) return error;

  const event = await prisma.event.findUnique({ where: { id: params.id } });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(event);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const body = await req.json();
  const { eventName, eventDate, startTime, endTime, recurrence } = body;

  if (recurrence && !Object.values(Recurrence).includes(recurrence)) {
    return NextResponse.json({ error: "Invalid recurrence" }, { status: 400 });
  }

  const event = await prisma.event.update({
    where: { id: params.id },
    data: {
      eventName,
      eventDate: eventDate ? zonedMidnightUtc(eventDate, await getOrgTimezone()) : undefined,
      startTime,
      endTime,
      recurrence: recurrence || undefined,
    },
  });

  return NextResponse.json(event);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  await prisma.event.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
