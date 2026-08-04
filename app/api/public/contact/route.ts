import { NextRequest, NextResponse } from "next/server";
import { sendContactEmail, sendContactConfirmationEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, email, hearAboutUs, message } = body;

  if (!email) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const submission = { name, email, hearAboutUs, message };

  // The notification to staff is the business-critical send - its result drives the
  // response. The confirmation back to the visitor is best-effort and shouldn't block
  // or fail the submission if it doesn't go through.
  const [result] = await Promise.all([
    sendContactEmail(submission),
    sendContactConfirmationEmail(submission),
  ]);

  if (!result.sent) {
    return NextResponse.json({ sent: false, error: result.error }, { status: 200 });
  }

  return NextResponse.json({ sent: true });
}
