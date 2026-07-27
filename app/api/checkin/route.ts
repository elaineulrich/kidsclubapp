import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/apiAuth";

export async function POST(req: NextRequest) {
  const { session, error } = await requireRole(["ADMIN", "VOLUNTEER"]);
  if (error) return error;

  const body = await req.json();
  const { childId, eventId, action } = body as {
    childId: string;
    eventId: string;
    action: "in" | "out";
  };

  if (!childId || !eventId || !action) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const now = new Date();

  const attendance = await prisma.attendance.upsert({
    where: { eventId_childId: { eventId, childId } },
    create: {
      eventId,
      childId,
      checkInTime: action === "in" ? now : null,
      checkedById: session!.user.id,
      status: action === "in" ? "PRESENT" : "ABSENT",
    },
    update:
      action === "in"
        ? { checkInTime: now, checkedById: session!.user.id, status: "PRESENT", checkOutTime: null }
        : { checkOutTime: now, status: "CHECKED_OUT" },
  });

  const child = await prisma.child.findUnique({ where: { id: childId } });

  return NextResponse.json({ attendance, childName: child?.childName });
}
