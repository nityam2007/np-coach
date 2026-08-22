import type { Transporter } from "nodemailer";
import { directusBeginEmailLog, directusFinishEmailLog } from "@/lib/directus-server";

export interface EmailTracking {
  idempotencyKey: string;
  type: string;
  sourceCollection?: string;
  sourceId?: number;
  reference?: string;
}

export interface EmailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  messageId?: string;
  tracking?: EmailTracking;
}

export interface EmailResult {
  ok: boolean;
  delivered: boolean;
  errorCode?: string;
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

function safeLogValue(value: string | undefined, max = 255): string | null {
  const clean = value?.replace(/[\r\n]+/g, " ").trim();
  return clean ? clean.slice(0, max) : null;
}

async function beginEmailLog(input: EmailInput): Promise<{ idempotencyKey: string } | null> {
  if (!input.tracking) return null;
  const key = safeLogValue(input.tracking.idempotencyKey, 200);
  if (!key) return null;

  const result = await directusBeginEmailLog({
    idempotencyKey: key,
    emailType: safeLogValue(input.tracking.type, 100),
    recipient: safeLogValue(input.to),
    subject: safeLogValue(input.subject),
    sourceCollection: safeLogValue(input.tracking.sourceCollection, 100),
    sourceId: input.tracking.sourceId ?? null,
    reference: safeLogValue(input.tracking.reference, 100),
    messageId: safeLogValue(input.messageId),
  });
  return result ? { idempotencyKey: key } : null;
}

async function finishEmailLog(log: { idempotencyKey: string } | null, delivered: boolean, errorCode?: string): Promise<void> {
  if (!log) return;
  await directusFinishEmailLog(log.idempotencyKey, delivered, delivered ? null : safeLogValue(errorCode, 100));
}

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
  const log = await beginEmailLog(input);
  if (!smtpConfigured(config)) {
    console.info(`[email:not-configured] → ${input.to} · ${input.subject}`);
    await finishEmailLog(log, false, "smtp_not_configured");
    return { ok: true, delivered: false, errorCode: "smtp_not_configured" };
  }

  try {
    const transporter = await getTransporter(config);
    const info = await transporter.sendMail({
      from: { name: config.fromName, address: config.fromAddress },
      to: input.to,
      replyTo: input.replyTo,
      messageId: input.messageId,
      subject: input.subject.replace(/[\r\n]+/g, " ").trim(),
      text: input.text,
      html: input.html,
    });
    const rejected = Array.isArray(info.rejected) ? info.rejected.length : 0;
    const delivered = rejected === 0;
    await finishEmailLog(log, delivered, delivered ? undefined : "recipient_rejected");
    return delivered
      ? { ok: true, delivered: true }
      : { ok: false, delivered: false, errorCode: "recipient_rejected" };
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "unknown";
    console.error(`[email] send failed (${code})`);
    transporterPromise = null;
    await finishEmailLog(log, false, code);
    return { ok: false, delivered: false, errorCode: code };
  }
}
