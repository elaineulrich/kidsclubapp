import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/apiAuth";
import { createInviteToken } from "@/lib/inviteToken";
import { sendInviteEmail } from "@/lib/email";
import { getBaseUrl } from "@/lib/baseUrl";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const user = await prisma.user.findUnique({ where: { id: params.id } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.passwordSetAt) {
    return NextResponse.json({ error: "This account has already set its password" }, { status: 400 });
  }

  const { token, tokenHash, expiresAt } = createInviteToken();
  await prisma.user.update({
    where: { id: params.id },
    data: { inviteTokenHash: tokenHash, inviteTokenExpiresAt: expiresAt },
  });

  const inviteUrl = `${getBaseUrl(req)}/accept-invite?token=${token}`;
  const invite = await sendInviteEmail(user.email, user.name, inviteUrl);

  return NextResponse.json({ invite, inviteUrl });
}
