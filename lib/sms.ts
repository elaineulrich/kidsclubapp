import twilio from "twilio";

// Same optional-provider pattern as lib/email.ts: without credentials configured,
// callers get back a clean { sent: false } instead of throwing, so nothing else
// has to know or care whether texting is set up yet.
const twilioClient =
  process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

export type SendSmsResult = { sent: boolean; error?: string };

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
