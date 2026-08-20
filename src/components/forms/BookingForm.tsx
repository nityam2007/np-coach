"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { startBooking } from "@/app/actions";
import type { FormState } from "@/lib/forms";
import { Turnstile } from "@/components/forms/Turnstile";
import { Button } from "@/components/ui/Button";
import { inputCls } from "@/components/ui/field";
import { RouteStopSelect } from "@/components/forms/RouteStopSelect";

export interface BookingStopOption {
  code: string;
  name: string;
}

const initial: FormState = { ok: false };

function formatGBP(pence: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);
}

function SubmitButton({ total }: { total: number }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Redirecting to payment…" : `Pay ${formatGBP(total)} & book`}
    </Button>
  );
}

export function BookingForm({
  stops,
  fareSingle,
  fareReturn,
  defaultFrom,
  defaultTo,
  defaultDate,
  defaultPassengers,
  defaultTripType,
  cancelled,
}: {
  stops: BookingStopOption[];
  fareSingle: number;
  fareReturn: number;
  defaultFrom?: string;
  defaultTo?: string;
  defaultDate?: string;
  defaultPassengers?: number;
  defaultTripType?: "single" | "return";
  cancelled?: boolean;
}) {
  const [state, action] = useActionState(startBooking, initial);
  const initialFrom = defaultFrom ?? stops[0]?.code ?? "";
  const initialTo = defaultTo && defaultTo !== initialFrom ? defaultTo : (stops.find((stop) => stop.code !== initialFrom)?.code ?? "");
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [tripType, setTripType] = useState<"single" | "return">(defaultTripType ?? "single");
  const [passengers, setPassengers] = useState(defaultPassengers && defaultPassengers > 0 ? defaultPassengers : 1);

  // On success the server returns a Stripe Checkout URL — send the browser there.
  useEffect(() => {
    if (state.ok && state.redirect) window.location.href = state.redirect;
  }, [state]);

  const unit = tripType === "return" ? fareReturn : fareSingle;
  const total = unit * (passengers > 0 ? passengers : 0);
  const sameStop = from === to;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="grid gap-4">
      {cancelled && !state.message && (
        <p className="rounded-lg bg-greyblue/15 px-4 py-2 text-sm text-navy">
          Payment cancelled — your booking wasn&apos;t taken. You can try again below.
        </p>
      )}
      {state.message && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{state.message}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold text-navy">
          From
          <RouteStopSelect name="from" value={from} onChange={setFrom} options={stops.filter((stop) => stop.code !== to)} ariaLabel="Departure stop" buttonClassName={inputCls} />
          {state.errors?.from && (
            <span className="mt-1 block text-xs font-normal text-red-600">{state.errors.from}</span>
          )}
        </label>
        <label className="text-sm font-semibold text-navy">
          To
          <RouteStopSelect name="to" value={to} onChange={setTo} options={stops.filter((stop) => stop.code !== from)} ariaLabel="Destination stop" buttonClassName={inputCls} />
          {(state.errors?.to || sameStop) && (
            <span className="mt-1 block text-xs font-normal text-red-600">
              {state.errors?.to ?? "From and To must be different stops"}
            </span>
          )}
        </label>
      </div>

      <fieldset className="text-sm font-semibold text-navy">
        <legend>Trip type</legend>
        <div className="mt-2 flex gap-4">
          {(["single", "return"] as const).map((t) => (
            <label key={t} className="flex items-center gap-2 font-normal capitalize">
              <input type="radio" name="tripType" value={t} checked={tripType === t} onChange={() => setTripType(t)} />
              {t}
              <span className="text-navy/70">({formatGBP(t === "return" ? fareReturn : fareSingle)})</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold text-navy">
          Travel date
          <input name="date" type="date" min={today} defaultValue={defaultDate} required className={inputCls} />
          {state.errors?.date && (
            <span className="mt-1 block text-xs font-normal text-red-600">{state.errors.date}</span>
          )}
        </label>
        <label className="text-sm font-semibold text-navy">
          Passengers
          <input
            name="passengers"
            type="number"
            min={1}
            max={50}
            value={passengers}
            onChange={(e) => setPassengers(Math.max(1, Number(e.target.value) || 1))}
            required
            className={inputCls}
          />
          {state.errors?.passengers && (
            <span className="mt-1 block text-xs font-normal text-red-600">{state.errors.passengers}</span>
          )}
        </label>
      </div>

      <label className="text-sm font-semibold text-navy">
        Lead passenger name
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

      {/* Honeypot — hidden from users; bots fill it and get rejected. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] h-0 w-0"
      />

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-greyblue/10 px-4 py-3">
        <span className="text-sm text-navy/70">
          {passengers} × {tripType} · {stops.find((s) => s.code === from)?.name} → {stops.find((s) => s.code === to)?.name}
        </span>
        <span className="font-display text-xl font-bold text-navy">{formatGBP(total)}</span>
      </div>

      <Turnstile resetSignal={state} />
      <SubmitButton total={total} />
      <p className="text-xs text-navy/70">
        Payments are processed securely by Stripe. Online tickets are non-refundable; please book at least 1 hour before
        departure and arrive 15 minutes early.
      </p>
    </form>
  );
}
