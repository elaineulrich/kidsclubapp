import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/apiAuth";
import { sendSms, toE164 } from "@/lib/sms";
import { getOrgTimezone } from "@/lib/orgTime";

// Texts every opted-in family (deduped - a family with multiple active children
// only gets one text) a reminder about this event. Admin-triggered, not scheduled -
// texting is new enough that an admin should decide when to send rather than it
// firing automatically.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const event = await prisma.event.findUnique({ where: { id: params.id } });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const children = await prisma.child.findMany({
    where: { activeStatus: true },
    include: { family: true },
  });

  const familiesById = new Map<string, (typeof children)[number]["family"]>();
  for (const c of children) familiesById.set(c.family.id, c.family);

  const timeZone = await getOrgTimezone();
  const eventDateLabel = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(event.eventDate);

  const message = `Haven Kids Club reminder: ${event.eventName} is ${eventDateLabel}, ${event.startTime}-${event.endTime}. See you there! Reply STOP to opt out.`;

  const results = await Promise.all(
    Array.from(familiesById.values()).map(async (family) => {
      const base = { familyId: family.id, parentName: family.parentName };
      if (!family.smsOptIn) {
        return { ...base, sent: false, skipped: true, error: "Not opted in" };
      }
      const to = toE164(family.phone);
      if (!to) {
        return { ...base, sent: false, skipped: false, error: "Invalid phone number" };
      }
      const result = await sendSms(to, message);
      return { ...base, skipped: false, ...result };
    })
  );

  const sentCount = results.filter((r) => r.sent).length;
  const skippedCount = results.filter((r) => r.skipped).length;
  const failedCount = results.filter((r) => !r.sent && !r.skipped).length;

  return NextResponse.json({ sentCount, skippedCount, failedCount, results });
}
