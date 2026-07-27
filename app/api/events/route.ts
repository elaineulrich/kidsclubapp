import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/apiAuth";

export async function GET() {
  const { error } = await requireRole(["ADMIN", "VOLUNTEER", "DRIVER"]);
  if (error) return error;

  const events = await prisma.event.findMany({
    orderBy: { eventDate: "desc" },
  });

  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const body = await req.json();
  const { eventName, eventDate, startTime, endTime } = body;

  if (!eventName || !eventDate || !startTime || !endTime) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const event = await prisma.event.create({
    data: { eventName, eventDate: new Date(eventDate), startTime, endTime },
  });

  return NextResponse.json(event, { status: 201 });
}
