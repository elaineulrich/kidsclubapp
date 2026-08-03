import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { hashInviteToken } from "@/lib/inviteToken";

async function findByToken(token: string) {
  const user = await prisma.user.findUnique({ where: { inviteTokenHash: hashInviteToken(token) } });
  if (!user || !user.inviteTokenExpiresAt || user.inviteTokenExpiresAt < new Date()) return null;
  return user;
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const user = await findByToken(token);
  if (!user) return NextResponse.json({ error: "This invite link is invalid or has expired" }, { status: 404 });

  // Distinguishes a fresh invite (never set a password) from a forgot-password reset
  // (already had one) so the page can show the right copy - the token mechanism
  // underneath is identical either way.
  return NextResponse.json({ name: user.name, email: user.email, passwordAlreadySet: !!user.passwordSetAt });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { token, password } = body;

  if (!token || !password) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const user = await findByToken(token);
  if (!user) return NextResponse.json({ error: "This invite link is invalid or has expired" }, { status: 404 });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(password, 10),
      passwordSetAt: new Date(),
      inviteTokenHash: null,
      inviteTokenExpiresAt: null,
    },
  });

  return NextResponse.json({ ok: true });
}
