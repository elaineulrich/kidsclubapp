import { NextRequest, NextResponse } from "next/server";
import { sendContactEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, email, hearAboutUs, message } = body;

  if (!email) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const result = await sendContactEmail({ name, email, hearAboutUs, message });

  if (!result.sent) {
    return NextResponse.json({ sent: false, error: result.error }, { status: 200 });
  }

  return NextResponse.json({ sent: true });
}
