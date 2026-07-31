import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/apiAuth";
import { Role } from "@prisma/client";
import { createInviteToken } from "@/lib/inviteToken";
import { sendInviteEmail } from "@/lib/email";
import { getBaseUrl } from "@/lib/baseUrl";

export async function GET() {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      activeStatus: true,
      createdDate: true,
      passwordSetAt: true,
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users.map((u) => ({ ...u, invitePending: !u.passwordSetAt })));
}

// Creates a staff account with no password and emails the person an invite link
// to set their own; the account can't log in until they do (passwordHash is a
// random, unusable placeholder until accept-invite runs).
export async function POST(req: NextRequest) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const body = await req.json();
  const { name, email, role } = body;

  if (!name || !email || !role) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!Object.values(Role).includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return NextResponse.json({ error: "An account with that email already exists" }, { status: 409 });
  }

  const placeholderHash = await bcrypt.hash(randomUUID(), 10);
  const { token, tokenHash, expiresAt } = createInviteToken();

  const user = await prisma.user.create({
    data: {
      name,
      email: normalizedEmail,
      passwordHash: placeholderHash,
      role,
      inviteTokenHash: tokenHash,
      inviteTokenExpiresAt: expiresAt,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      activeStatus: true,
      createdDate: true,
    },
  });

  const inviteUrl = `${getBaseUrl(req)}/accept-invite?token=${token}`;
  const invite = await sendInviteEmail(normalizedEmail, name, inviteUrl);

  return NextResponse.json({ user, invite, inviteUrl }, { status: 201 });
}
