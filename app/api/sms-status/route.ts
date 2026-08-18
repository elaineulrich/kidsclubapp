import { NextResponse } from "next/server";
import { requireRole } from "@/lib/apiAuth";

// Whether Twilio is actually connected - lets admin UI gray out send buttons
// (Text Reminder, Text Drivers Their Routes) as "Coming Soon" until real
// credentials are set, without needing a code change to re-enable them later.
export async function GET() {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const configured = Boolean(
    process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER
  );

  return NextResponse.json({ configured });
}
