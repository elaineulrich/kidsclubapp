import twilio from "twilio";

// Same optional-provider pattern as lib/email.ts: without credentials configured,
// callers get back a clean { sent: false } instead of throwing, so nothing else
// has to know or care whether texting is set up yet.
const twilioClient =
  process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

export type SendSmsResult = { sent: boolean; error?: string };

// Family/driver phone numbers are stored as free-form text (e.g. "254-320-7123"),
// but Twilio requires E.164 (e.g. "+12543207123"). Assumes US numbers, matching
// the rest of this app (church address, timezone default, etc. are all US-only).
export function toE164(phone: string): string | null {
  if (phone.startsWith("+")) return phone;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

// Generic text sender - no specific triggers wired up to this yet (route-ready
// notifications, check-in confirmations, etc. are still to be decided). `to`
// should be a phone number in E.164 format (e.g. "+12345550123").
export async function sendSms(to: string, body: string): Promise<SendSmsResult> {
  if (!twilioClient) {
    return { sent: false, error: "SMS isn't configured (missing TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN)" };
  }
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!from) {
    return { sent: false, error: "SMS isn't configured (missing TWILIO_PHONE_NUMBER)" };
  }

  try {
    await twilioClient.messages.create({ to, from, body });
    return { sent: true };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
