import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export type SendRouteEmailResult = { sent: boolean; error?: string };

export async function sendRouteEmail(
  to: string,
  driverName: string,
  eventName: string,
  eventDateLabel: string,
  routeUrl: string
): Promise<SendRouteEmailResult> {
  if (!resend) {
    return { sent: false, error: "Email isn't configured (missing RESEND_API_KEY)" };
  }

  const from = process.env.EMAIL_FROM || "Haven Kids Club <onboarding@resend.dev>";

  try {
    const { error } = await resend.emails.send({
      from,
      to,
      subject: `Your ${eventName} route - ${eventDateLabel}`,
      html: `
        <p>Hi ${driverName},</p>
        <p>Your pickup route for <strong>${eventName}</strong> on ${eventDateLabel} is ready:</p>
        <p><a href="${routeUrl}">${routeUrl}</a></p>
        <p>Log in with your driver code to view stops, navigate, and check kids in/out.</p>
      `,
    });
    if (error) return { sent: false, error: error.message };
    return { sent: true };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export type SendInviteEmailResult = { sent: boolean; error?: string };

export async function sendInviteEmail(
  to: string,
  name: string,
  inviteUrl: string
): Promise<SendInviteEmailResult> {
  if (!resend) {
    return { sent: false, error: "Email isn't configured (missing RESEND_API_KEY)" };
  }

  const from = process.env.EMAIL_FROM || "Haven Kids Club <onboarding@resend.dev>";

  try {
    const { error } = await resend.emails.send({
      from,
      to,
      subject: "You're invited to Haven Kids Club",
      html: `
        <p>Hi ${name},</p>
        <p>You've been invited to join the Haven Kids Club admin app. Click below to set your password and get started:</p>
        <p><a href="${inviteUrl}">${inviteUrl}</a></p>
        <p>This link expires in 7 days.</p>
      `,
    });
    if (error) return { sent: false, error: error.message };
    return { sent: true };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
