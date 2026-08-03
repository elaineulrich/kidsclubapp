import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendDriverCodeEmail } from "@/lib/email";

// Public (no auth) - driver codes aren't secrets a driver is expected to memorize, so
// rather than a reset flow this just re-sends the existing code to the driver's
// registered email. Always responds the same way regardless of whether the email
// matches a driver, so this can't be used to discover who's registered.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const email = (body.email || "").toLowerCase().trim();
  if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });

  const driver = await prisma.driver.findFirst({
    where: { email: { equals: email, mode: "insensitive" }, activeStatus: true },
  });
  if (driver && driver.email) {
    await sendDriverCodeEmail(driver.email, driver.name, driver.loginCode);
  }

  return NextResponse.json({ ok: true });
}
