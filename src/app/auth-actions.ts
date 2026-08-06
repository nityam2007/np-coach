"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createAndSendOtp, verifyOtp } from "@/lib/account";
import { createSession, destroySession } from "@/lib/auth";
import { verifyTurnstile } from "@/lib/forms";
import { getSettings } from "@/lib/directus";
import { clientIp, rateLimited, rateLimitKey, RATE_LIMITS } from "@/lib/security";

/** Passwordless login: request an emailed OTP, then verify it to open a session. */

const emailSchema = z.string().trim().toLowerCase().email().max(200);

export interface AuthState {
  step: "email" | "code";
  email?: string;
  message?: string;
  /** Dev-only: the code, surfaced on-screen when no SMTP is configured. Never set in production. */
  devCode?: string;
}

export async function requestOtpAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { step: "email", message: "Please enter a valid email address." };
  const email = parsed.data;

  const ip = await clientIp();
  if (
    rateLimited(rateLimitKey("otp-request-ip", ip), RATE_LIMITS.otpRequest) ||
    rateLimited(rateLimitKey("otp-request-email", email), RATE_LIMITS.otpRequest)
  ) {
    return { step: "email", email, message: "Too many requests — please wait 15 minutes and try again." };
  }

  const turnstile = formData.get("cf-turnstile-response");
  if (!(await verifyTurnstile(typeof turnstile === "string" ? turnstile : undefined, ip))) {
    return { step: "email", email, message: "Security check failed — please refresh and try again." };
  }

  const settings = await getSettings();
  const res = await createAndSendOtp(email, settings);
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
  if (
    rateLimited(rateLimitKey("otp-verify-ip", ip), RATE_LIMITS.otpVerify) ||
    rateLimited(rateLimitKey("otp-verify-email", email), { ...RATE_LIMITS.otpVerify, limit: 5 })
  ) {
    return { step: "code", email, message: "Too many attempts — please wait 15 minutes and try again." };
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
