"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { submitContact } from "@/app/actions";
import type { FormState } from "@/lib/forms";
import { Turnstile } from "@/components/forms/Turnstile";

const initial: FormState = { ok: false };

const inputClass =
  "mt-1 w-full rounded-md border border-greyblue/40 px-3 py-2 text-sm text-navy focus:border-accent focus:outline-none";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-accent px-6 py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {pending ? "Sending…" : "Send message"}
    </button>
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
      {state.message && <p className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">{state.message}</p>}

      <label className="text-sm font-semibold text-navy">
        Name
        <input name="name" type="text" required autoComplete="name" className={inputClass} />
        {state.errors?.name && <span className="mt-1 block text-xs font-normal text-red-600">{state.errors.name}</span>}
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold text-navy">
          Email
          <input name="email" type="email" required autoComplete="email" className={inputClass} />
          {state.errors?.email && (
            <span className="mt-1 block text-xs font-normal text-red-600">{state.errors.email}</span>
          )}
        </label>
        <label className="text-sm font-semibold text-navy">
          Phone <span className="font-normal text-navy/50">(optional)</span>
          <input name="phone" type="tel" autoComplete="tel" className={inputClass} />
        </label>
      </div>

      <label className="text-sm font-semibold text-navy">
        Subject <span className="font-normal text-navy/50">(optional)</span>
        <input name="subject" type="text" className={inputClass} />
      </label>

      <label className="text-sm font-semibold text-navy">
        Message
        <textarea name="message" required rows={5} className={inputClass} />
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

      <Turnstile />
      <SubmitButton />
    </form>
  );
}
