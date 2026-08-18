import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const CONTACT_EMAIL = process.env.CONTACT_EMAIL || "havenkidsclub@gmail.com";

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

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetUrl: string
): Promise<SendInviteEmailResult> {
  if (!resend) {
    return { sent: false, error: "Email isn't configured (missing RESEND_API_KEY)" };
  }

  const from = process.env.EMAIL_FROM || "Haven Kids Club <onboarding@resend.dev>";

  try {
    const { error } = await resend.emails.send({
      from,
      to,
      subject: "Reset your Haven Kids Club password",
      html: `
        <p>Hi ${name},</p>
        <p>Someone requested a password reset for your Haven Kids Club account. Click below to choose a new password:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>This link expires in 7 days. If you didn't request this, you can ignore this email.</p>
      `,
    });
    if (error) return { sent: false, error: error.message };
    return { sent: true };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function sendDriverCodeEmail(
  to: string,
  name: string,
  loginCode: string
): Promise<SendInviteEmailResult> {
  if (!resend) {
    return { sent: false, error: "Email isn't configured (missing RESEND_API_KEY)" };
  }

  const from = process.env.EMAIL_FROM || "Haven Kids Club <onboarding@resend.dev>";

  try {
    const { error } = await resend.emails.send({
      from,
      to,
      subject: "Your Haven Kids Club driver code",
      html: `
        <p>Hi ${name},</p>
        <p>Here's your driver code for the Haven Kids Club driver portal:</p>
        <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px;">${loginCode}</p>
        <p>If you didn't request this, you can ignore this email.</p>
      `,
    });
    if (error) return { sent: false, error: error.message };
    return { sent: true };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export type RegistrationChild = { childName: string; birthday?: string; childAge?: string; allergyInfo: string };

export type RegistrationSubmission = {
  children: RegistrationChild[];
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  transportationNeeds: string;
  smsOptIn: boolean;
};

function childNamesList(children: RegistrationChild[]): string {
  const names = children.map((c) => c.childName);
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

export async function sendRegistrationEmail(data: RegistrationSubmission): Promise<SendInviteEmailResult> {
  if (!resend) {
    return { sent: false, error: "Email isn't configured (missing RESEND_API_KEY)" };
  }

  const from = process.env.EMAIL_FROM || "Haven Kids Club <onboarding@resend.dev>";

  try {
    const { error } = await resend.emails.send({
      from,
      to: CONTACT_EMAIL,
      replyTo: data.parentEmail,
      subject: `New Kids Club Registration: ${childNamesList(data.children)}`,
      html: `
        <h2>New Kids Club Registration</h2>
        ${data.children
          .map(
            (c) => `
          <p><strong>Child's Full Name:</strong> ${c.childName}</p>
          <p><strong>Child's Birthday:</strong> ${c.birthday || "Not provided"}</p>
          <p><strong>Child's Age:</strong> ${c.childAge || "Not provided"}</p>
          <p><strong>Child's Allergy Info:</strong> ${c.allergyInfo}</p>
        `
          )
          .join("<hr>")}
        <p><strong>Parent/Guardian's Name:</strong> ${data.parentName}</p>
        <p><strong>Parent/Guardian's Email:</strong> ${data.parentEmail}</p>
        <p><strong>Parent/Guardian's Phone:</strong> ${data.parentPhone}</p>
        <p><strong>Street Address:</strong> ${data.address}, ${data.city}, ${data.state} ${data.zip}</p>
        <p><strong>Emergency Contact:</strong> ${
          [data.emergencyContactName, data.emergencyContactPhone, data.emergencyContactRelationship]
            .filter(Boolean)
            .join(" · ") || "Not provided"
        }</p>
        <p><strong>Transportation Needs:</strong> ${data.transportationNeeds}</p>
        <p><strong>SMS Opt-In:</strong> ${data.smsOptIn ? "Yes" : "No"}</p>
      `,
    });
    if (error) return { sent: false, error: error.message };
    return { sent: true };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function sendRegistrationConfirmationEmail(data: RegistrationSubmission): Promise<SendInviteEmailResult> {
  if (!resend) {
    return { sent: false, error: "Email isn't configured (missing RESEND_API_KEY)" };
  }

  const from = process.env.EMAIL_FROM || "Haven Kids Club <onboarding@resend.dev>";
  const names = childNamesList(data.children);

  try {
    const { error } = await resend.emails.send({
      from,
      to: data.parentEmail,
      replyTo: CONTACT_EMAIL,
      subject: "We got your Haven Kids Club registration!",
      html: `
        <p>Hi ${data.parentName},</p>
        <p>Thanks for registering <strong>${names}</strong> for Haven Kids Club! We've received your
        application and will be in touch soon.</p>
        <p>Here's what we received:</p>
        <ul>
          ${data.children
            .map((c) => `<li><strong>${c.childName}</strong> - Birthday: ${c.birthday || "Not provided"}, Age: ${c.childAge || "Not provided"}</li>`)
            .join("")}
          <li><strong>Transportation Needs:</strong> ${data.transportationNeeds}</li>
        </ul>
        <p>If anything above needs to be corrected, or you have questions in the meantime, just reply to this
        email or call us at (254) 221-6793.</p>
        <p>We can't wait to see ${names} at Kids Club!</p>
      `,
    });
    if (error) return { sent: false, error: error.message };
    return { sent: true };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export type ContactSubmission = {
  name: string;
  email: string;
  hearAboutUs?: string;
  message?: string;
};

export async function sendContactEmail(data: ContactSubmission): Promise<SendInviteEmailResult> {
  if (!resend) {
    return { sent: false, error: "Email isn't configured (missing RESEND_API_KEY)" };
  }

  const from = process.env.EMAIL_FROM || "Haven Kids Club <onboarding@resend.dev>";

  try {
    const { error } = await resend.emails.send({
      from,
      to: CONTACT_EMAIL,
      replyTo: data.email,
      subject: `New Contact Form Message from ${data.name || "website visitor"}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${data.name || "Not provided"}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        <p><strong>Where did you hear about us?</strong> ${data.hearAboutUs || "Not provided"}</p>
        ${data.message ? `<p><strong>Message:</strong> ${data.message}</p>` : ""}
      `,
    });
    if (error) return { sent: false, error: error.message };
    return { sent: true };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function sendContactConfirmationEmail(data: ContactSubmission): Promise<SendInviteEmailResult> {
  if (!resend) {
    return { sent: false, error: "Email isn't configured (missing RESEND_API_KEY)" };
  }

  const from = process.env.EMAIL_FROM || "Haven Kids Club <onboarding@resend.dev>";

  try {
    const { error } = await resend.emails.send({
      from,
      to: data.email,
      replyTo: CONTACT_EMAIL,
      subject: "We got your message - Haven Kids Club",
      html: `
        <p>Hi ${data.name || "there"},</p>
        <p>Thanks for reaching out to Haven Kids Club! We've received your message and will get back to
        you soon.</p>
        ${data.message ? `<p><strong>Your message:</strong> ${data.message}</p>` : ""}
        <p>If you need to reach us sooner, just reply to this email or call us at (254) 221-6793.</p>
      `,
    });
    if (error) return { sent: false, error: error.message };
    return { sent: true };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
