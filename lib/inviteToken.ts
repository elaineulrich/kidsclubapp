import { randomBytes, createHash } from "crypto";

const INVITE_EXPIRY_DAYS = 7;

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createInviteToken() {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  return { token, tokenHash: hashInviteToken(token), expiresAt };
}
