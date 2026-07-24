"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAndSendOtp, verifyOtp } from "@/lib/account";
import { createSession, destroySession } from "@/lib/auth";
import { rateLimited } from "@/lib/forms";
import { getSettings } from "@/lib/directus";

/** Passwordless login: request an emailed OTP, then verify it to open a session. */

const emailSchema = z.string().trim().toLowerCase().email().max(200);

export interface AuthState {
  step: "email" | "code";
  email?: string;
  message?: string;
  /** Dev-only: the code, surfaced on-screen when no SMTP is configured. Never set in production. */
  devCode?: string;
}

async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0] : h.get("cf-connecting-ip"))?.trim() || "unknown";
}

export async function requestOtpAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { step: "email", message: "Please enter a valid email address." };
  const email = parsed.data;

  const ip = await clientIp();
  if (rateLimited(`otp-req:${ip}`) || rateLimited(`otp-req:${email}`)) {
    return { step: "email", email, message: "Too many requests — please wait a minute and try again." };
  }

  const settings = await getSettings();
  const res = await createAndSendOtp(email, settings.name);
  if (!res.ok) return { step: "email", email, message: "Couldn't send a code right now. Please try again shortly." };

  return {
    step: "code",
    email,
    devCode: res.devCode,
    message: res.devCode ? undefined : "We've emailed you a 6-digit code. It expires in 10 minutes.",
  };
}

export async function verifyOtpAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { step: "email", message: "Your session expired — please start again." };
  const email = parsed.data;
  const code = String(formData.get("code") ?? "").trim();

  const ip = await clientIp();
  if (rateLimited(`otp-vfy:${ip}`)) {
    return { step: "code", email, message: "Too many attempts — please wait a minute and try again." };
  }

  const ok = await verifyOtp(email, code);
  if (!ok) return { step: "code", email, message: "That code is invalid or has expired. Please try again." };

  await createSession(email);
  redirect("/account");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}
