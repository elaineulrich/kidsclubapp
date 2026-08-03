import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createInviteToken } from "@/lib/inviteToken";
import { sendPasswordResetEmail } from "@/lib/email";
import { getBaseUrl } from "@/lib/baseUrl";

// Public (no auth) - this is how a locked-out admin or volunteer gets back in. Always
// responds the same way regardless of whether the email matches an account, so this
// can't be used to discover which addresses are registered.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const email = (body.email || "").toLowerCase().trim();
  if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email } });
  if (user && user.activeStatus) {
    const { token, tokenHash, expiresAt } = createInviteToken();
    await prisma.user.update({
      where: { id: user.id },
      data: { inviteTokenHash: tokenHash, inviteTokenExpiresAt: expiresAt },
    });

    const resetUrl = `${getBaseUrl(req)}/accept-invite?token=${token}`;
    await sendPasswordResetEmail(user.email, user.name, resetUrl);
  }

  return NextResponse.json({ ok: true });
}
