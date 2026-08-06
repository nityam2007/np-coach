"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { submitContact } from "@/app/actions";
import type { FormState } from "@/lib/forms";
import { Turnstile } from "@/components/forms/Turnstile";
import { Button } from "@/components/ui/Button";
import { inputCls } from "@/components/ui/field";

const initial: FormState = { ok: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Sending…" : "Send message"}
    </Button>
  );
}

export function ContactForm() {
  const [state, action] = useActionState(submitContact, initial);

  if (state.ok) {
    return (
      <div className="rounded-xl border border-accent/40 bg-accent/5 p-6 text-navy">
        <p className="font-display text-lg font-semibold">Message sent</p>
        <p className="mt-1 text-sm text-navy/70">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-4">
      {state.message && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{state.message}</p>}

      <label className="text-sm font-semibold text-navy">
        Name
        <input name="name" type="text" required autoComplete="name" className={inputCls} />
        {state.errors?.name && <span className="mt-1 block text-xs font-normal text-red-600">{state.errors.name}</span>}
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold text-navy">
          Email
          <input name="email" type="email" required autoComplete="email" className={inputCls} />
          {state.errors?.email && (
            <span className="mt-1 block text-xs font-normal text-red-600">{state.errors.email}</span>
          )}
        </label>
        <label className="text-sm font-semibold text-navy">
          Phone <span className="font-normal text-navy/70">(optional)</span>
          <input name="phone" type="tel" autoComplete="tel" className={inputCls} />
        </label>
      </div>

      <label className="text-sm font-semibold text-navy">
        Subject <span className="font-normal text-navy/70">(optional)</span>
        <input name="subject" type="text" className={inputCls} />
      </label>

      <label className="text-sm font-semibold text-navy">
        Message
        <textarea name="message" required rows={5} className={inputCls} />
        {state.errors?.message && (
          <span className="mt-1 block text-xs font-normal text-red-600">{state.errors.message}</span>
        )}
      </label>

      {/* Honeypot — hidden from users; bots fill it and get rejected. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] h-0 w-0"
      />

      <Turnstile resetSignal={state} />
      <SubmitButton />
    </form>
  );
}
