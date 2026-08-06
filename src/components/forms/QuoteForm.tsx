"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { submitQuote } from "@/app/actions";
import type { FormState } from "@/lib/forms";
import { Turnstile } from "@/components/forms/Turnstile";
import { Button } from "@/components/ui/Button";
import { inputCls } from "@/components/ui/field";

const initial: FormState = { ok: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? "Sending…" : "Request my quote"}</Button>;
}

export function QuoteForm() {
  const [state, action] = useActionState(submitQuote, initial);
  if (state.ok) {
    return <div className="rounded-xl border border-accent/40 bg-accent/5 p-6 text-navy"><p className="font-display text-lg font-semibold">Quote request sent</p><p className="mt-1 text-sm text-navy/70">{state.message}</p></div>;
  }
  const error = (name: string) => state.errors?.[name] && <span className="mt-1 block text-xs font-normal text-red-600">{state.errors[name]}</span>;
  return (
    <form action={action} className="grid gap-4">
      {state.message && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{state.message}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold text-navy">Name<input name="name" required autoComplete="name" className={inputCls} />{error("name")}</label>
        <label className="text-sm font-semibold text-navy">Phone<input name="phone" required type="tel" autoComplete="tel" className={inputCls} />{error("phone")}</label>
      </div>
      <label className="text-sm font-semibold text-navy">Email<input name="email" required type="email" autoComplete="email" className={inputCls} />{error("email")}</label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold text-navy">Pickup location<input name="pickup" required className={inputCls} />{error("pickup")}</label>
        <label className="text-sm font-semibold text-navy">Destination<input name="destination" required className={inputCls} />{error("destination")}</label>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-sm font-semibold text-navy">Outward date<input name="outboundDate" required type="date" className={inputCls} />{error("outboundDate")}</label>
        <label className="text-sm font-semibold text-navy">Return date <span className="font-normal text-navy/70">(optional)</span><input name="returnDate" type="date" className={inputCls} />{error("returnDate")}</label>
        <label className="text-sm font-semibold text-navy">Passengers<input name="passengers" required type="number" min="1" max="200" className={inputCls} />{error("passengers")}</label>
      </div>
      <label className="text-sm font-semibold text-navy">Preferred coach size <span className="font-normal text-navy/70">(optional)</span><input name="coachSize" placeholder="e.g. 49 seats" className={inputCls} /></label>
      <label className="text-sm font-semibold text-navy">Journey details<textarea name="journeyDetails" required rows={5} placeholder="Timings, stops, accessibility or luggage requirements" className={inputCls} />{error("journeyDetails")}</label>
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute left-[-9999px] h-0 w-0" />
      <Turnstile resetSignal={state} />
      <SubmitButton />
    </form>
  );
}
