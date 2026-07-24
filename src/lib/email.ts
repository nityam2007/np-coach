/**
 * Pluggable transactional email. When M365 (or any) SMTP is configured via env, mail
 * is sent with nodemailer; otherwise delivery is skipped gracefully and the message is
 * logged server-side (so the flow still works in dev). Callers get `delivered` so they
 * can, in dev only, surface an OTP on-screen when nothing was actually emailed.
 *
 * Env: SMTP_HOST, SMTP_PORT (default 587), SMTP_SECURE ("true" for 465), SMTP_USER,
 *      SMTP_PASS, SMTP_FROM (defaults to SMTP_USER).
 */

export interface EmailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendEmail(input: EmailInput): Promise<{ ok: boolean; delivered: boolean }> {
  if (!smtpConfigured()) {
    console.info(`[email:not-configured] → ${input.to} · ${input.subject}\n${input.text}`);
    return { ok: true, delivered: false };
  }
  try {
    const nodemailer = (await import("nodemailer")).default;
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    return { ok: true, delivered: true };
  } catch (err) {
    console.error("[email] send failed:", err);
    return { ok: false, delivered: false };
  }
}
