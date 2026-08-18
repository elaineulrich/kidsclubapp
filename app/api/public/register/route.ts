import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendRegistrationEmail, sendRegistrationConfirmationEmail } from "@/lib/email";

type ChildInput = { childName: string; birthday?: string; childAge?: string; allergyInfo: string };

function parseAge(input?: string): number | null {
  if (!input) return null;
  const n = parseInt(input, 10);
  return Number.isNaN(n) ? null : n;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    children,
    parentName,
    parentEmail,
    parentPhone,
    address,
    addressLine2,
    city,
    state,
    zip,
    emergencyContactName,
    emergencyContactPhone,
    emergencyContactRelationship,
    transportationNeeds,
    smsOptIn,
  } = body as {
    children?: ChildInput[];
    parentName?: string;
    parentEmail?: string;
    parentPhone?: string;
    address?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    zip?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    emergencyContactRelationship?: string;
    transportationNeeds?: string;
    smsOptIn?: boolean;
  };

  const validChildren = (children ?? []).filter((c) => c.childName?.trim() && c.allergyInfo?.trim());

  if (
    validChildren.length === 0 ||
    !parentName || !parentEmail || !parentPhone ||
    !address || !city || !state || !zip ||
    !transportationNeeds
  ) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Reuse an existing family (matched by phone or email) instead of creating a
  // duplicate parent record if this family has registered before - existing
  // family fields are left as-is so a public submission can't silently overwrite
  // anything staff may have already corrected.
  let family = await prisma.family.findFirst({
    where: { OR: [{ phone: parentPhone }, { email: parentEmail }] },
  });

  if (!family) {
    family = await prisma.family.create({
      data: {
        parentName,
        phone: parentPhone,
        email: parentEmail,
        address,
        addressLine2: addressLine2 || null,
        city,
        state,
        zip,
        emergencyContactName: emergencyContactName || null,
        emergencyContactPhone: emergencyContactPhone || null,
        emergencyContactRelationship: emergencyContactRelationship || null,
        smsOptIn: smsOptIn === true,
      },
    });
  }

  await prisma.child.createMany({
    data: validChildren.map((c) => ({
      familyId: family!.id,
      childName: c.childName.trim(),
      birthday: c.birthday ? new Date(c.birthday) : null,
      age: parseAge(c.childAge),
      medicalNotes: c.allergyInfo.trim(),
      pickupRequired: transportationNeeds === "Yes",
    })),
  });

  const submission = {
    children: validChildren,
    parentName,
    parentEmail,
    parentPhone,
    address,
    city,
    state,
    zip,
    emergencyContactName,
    emergencyContactPhone,
    emergencyContactRelationship,
    transportationNeeds,
    smsOptIn: smsOptIn === true,
  };

  // The notification to staff is the business-critical send - its result drives the
  // response. The confirmation back to the parent is best-effort and shouldn't block
  // or fail the submission if it doesn't go through. The Family/Child records above
  // are already saved regardless of whether either email succeeds.
  const [result] = await Promise.all([
    sendRegistrationEmail(submission),
    sendRegistrationConfirmationEmail(submission),
  ]);

  if (!result.sent) {
    return NextResponse.json({ sent: false, error: result.error }, { status: 200 });
  }

  return NextResponse.json({ sent: true });
}
