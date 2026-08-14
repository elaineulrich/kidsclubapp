import { NextRequest, NextResponse } from "next/server";
import { sendRegistrationEmail, sendRegistrationConfirmationEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    childName,
    childAge,
    allergyInfo,
    parentName,
    parentEmail,
    parentPhone,
    address,
    transportationNeeds,
    smsOptIn,
  } = body;

  if (!childName || !allergyInfo || !parentName || !parentEmail || !parentPhone || !address || !transportationNeeds) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const submission = {
    childName,
    childAge,
    allergyInfo,
    parentName,
    parentEmail,
    parentPhone,
    address,
    transportationNeeds,
    smsOptIn: smsOptIn === true,
  };

  // The notification to staff is the business-critical send - its result drives the
  // response. The confirmation back to the parent is best-effort and shouldn't block
  // or fail the submission if it doesn't go through.
  const [result] = await Promise.all([
    sendRegistrationEmail(submission),
    sendRegistrationConfirmationEmail(submission),
  ]);

  if (!result.sent) {
    return NextResponse.json({ sent: false, error: result.error }, { status: 200 });
  }

  return NextResponse.json({ sent: true });
}
