import type { Transporter } from "nodemailer";

export interface EmailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  messageId?: string;
}

export interface EmailResult {
  ok: boolean;
  delivered: boolean;
}

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  authEnabled: boolean;
  tlsEnabled: boolean;
  requireTls: boolean;
  user: string;
  pass: string;
  fromAddress: string;
  fromName: string;
}

let transporterPromise: Promise<Transporter> | null = null;

function envBoolean(name: string, fallback: boolean): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return fallback;
  return value === "true" || value === "1" || value === "yes" || value === "on";
}

function smtpConfig(): SmtpConfig {
  const user = process.env.SMTP_USER?.trim() ?? "";
  const pass = process.env.SMTP_PASS ?? "";
  return {
    host: process.env.SMTP_HOST?.trim() ?? "",
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: envBoolean("SMTP_SECURE", false),
    authEnabled: envBoolean("SMTP_AUTH", Boolean(user && pass)),
    tlsEnabled: envBoolean("SMTP_TLS", true),
    requireTls: envBoolean("SMTP_REQUIRE_TLS", false),
    user,
    pass,
    fromAddress: process.env.SMTP_FROM?.trim() || user,
    fromName: process.env.SMTP_FROM_NAME?.trim() || "NP Coaches",
  };
}

function smtpConfigured(config: SmtpConfig): boolean {
  if (!config.host || !config.fromAddress || !Number.isInteger(config.port) || config.port <= 0) return false;
  return !config.authEnabled || Boolean(config.user && config.pass);
}

async function getTransporter(config: SmtpConfig): Promise<Transporter> {
  if (!transporterPromise) {
    transporterPromise = import("nodemailer").then(({ default: nodemailer }) =>
      nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        ignoreTLS: !config.tlsEnabled,
        requireTLS: config.requireTls,
        auth: config.authEnabled ? { user: config.user, pass: config.pass } : undefined,
        pool: true,
        maxConnections: 3,
        maxMessages: 100,
        connectionTimeout: 15_000,
        greetingTimeout: 15_000,
        socketTimeout: 30_000,
      }),
    );
  }
  return transporterPromise;
}

export async function sendEmail(input: EmailInput): Promise<EmailResult> {
  const config = smtpConfig();
  if (!smtpConfigured(config)) {
    console.info(`[email:not-configured] → ${input.to} · ${input.subject}`);
    return { ok: true, delivered: false };
  }

  try {
    const transporter = await getTransporter(config);
    await transporter.sendMail({
      from: { name: config.fromName, address: config.fromAddress },
      to: input.to,
      replyTo: input.replyTo,
      messageId: input.messageId,
      subject: input.subject.replace(/[\r\n]+/g, " ").trim(),
      text: input.text,
      html: input.html,
    });
    return { ok: true, delivered: true };
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "unknown";
    console.error(`[email] send failed (${code})`);
    transporterPromise = null;
    return { ok: false, delivered: false };
  }
}
