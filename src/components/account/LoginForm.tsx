"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { requestOtpAction, verifyOtpAction, type AuthState } from "@/app/auth-actions";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { inputCls } from "@/components/ui/field";
import { Turnstile } from "@/components/forms/Turnstile";

const initialReq: AuthState = { step: "email" };
const initialVfy: AuthState = { step: "code" };

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Please wait…" : label}
    </Button>
  );
}

/** Passwordless login: enter email → receive a 6-digit code → verify. On success the
 *  verify action redirects to /account. */
export function LoginForm() {
  const [reqState, reqAction] = useActionState(requestOtpAction, initialReq);
  const [vfyState, vfyAction] = useActionState(verifyOtpAction, initialVfy);

  const onCodeStep = reqState.step === "code";
  const email = reqState.email ?? "";

  if (!onCodeStep) {
    return (
      <form action={reqAction} className="grid gap-4">
        <label className="text-sm font-semibold text-navy">
          Email address
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            defaultValue={reqState.email}
            className={inputCls}
          />
        </label>
        {reqState.message && <p className="text-sm text-red-600">{reqState.message}</p>}
        <Turnstile resetSignal={reqState} />
        <Submit label="Email me a code" />
        <p className="text-xs text-navy/70">
          No password needed — we&apos;ll email you a one-time code. New here? An account is created automatically.
        </p>
      </form>
    );
  }

  return (
    <form action={vfyAction} className="grid gap-4">
      <input type="hidden" name="email" value={email} />
      <p className="text-sm text-navy/70">
        We sent a 6-digit code to <span className="font-semibold text-navy">{email}</span>.
      </p>
      {reqState.devCode && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Dev mode (email not configured): your code is{" "}
          <span className="font-mono font-bold tracking-widest">{reqState.devCode}</span>
        </p>
      )}
      <label className="text-sm font-semibold text-navy">
        6-digit code
        <input
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          required
          autoFocus
          placeholder="123456"
          className={`${inputCls} text-center text-lg tracking-[0.4em]`}
        />
      </label>
      {vfyState.message && <p className="text-sm text-red-600">{vfyState.message}</p>}
      <Submit label="Verify & sign in" />
      <div className="flex items-center justify-between text-sm">
        <button type="submit" formAction={reqAction} className="font-medium text-accent hover:underline">
          Resend code
        </button>
        <Link href="/account/login" className="flex items-center gap-1 font-medium text-navy/70 hover:text-navy">
          <Icon name="arrowLeft" className="h-4 w-4" />
          Different email
        </Link>
      </div>
    </form>
  );
}
