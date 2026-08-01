import { NextRequest, NextResponse } from "next/server";
import { sendRegistrationEmail } from "@/lib/email";

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
  } = body;

  if (!childName || !allergyInfo || !parentName || !parentEmail || !parentPhone || !address || !transportationNeeds) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const result = await sendRegistrationEmail({
    childName,
    childAge,
    allergyInfo,
    parentName,
    parentEmail,
    parentPhone,
    address,
    transportationNeeds,
  });

  if (!result.sent) {
    return NextResponse.json({ sent: false, error: result.error }, { status: 200 });
  }

  return NextResponse.json({ sent: true });
}
