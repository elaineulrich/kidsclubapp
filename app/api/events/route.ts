import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/apiAuth";
import { getOrgTimezone, zonedMidnightUtc } from "@/lib/orgTime";
import { ensureUpcomingOccurrences } from "@/lib/recurringEvents";
import { Recurrence } from "@prisma/client";

export async function GET() {
  const { error } = await requireRole(["ADMIN", "VOLUNTEER", "DRIVER"]);
  if (error) return error;

  await ensureUpcomingOccurrences();

  const events = await prisma.event.findMany({
    orderBy: { eventDate: "desc" },
  });

  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const body = await req.json();
  const { eventName, eventDate, startTime, endTime, recurrence } = body;

  if (!eventName || !eventDate || !startTime || !endTime) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (recurrence && !Object.values(Recurrence).includes(recurrence)) {
    return NextResponse.json({ error: "Invalid recurrence" }, { status: 400 });
  }

  // Manually created events start fully unassigned so an admin reviews and builds
  // the roster themselves (the "usually rides X" suggestion is still there to make
  // that fast) - only auto-generated recurring occurrences self-populate, since
  // there's no one present to review those.
  const event = await prisma.event.create({
    data: {
      eventName,
      eventDate: zonedMidnightUtc(eventDate, await getOrgTimezone()),
      startTime,
      endTime,
      recurrence: recurrence || "NONE",
    },
  });

  return NextResponse.json(event, { status: 201 });
}
