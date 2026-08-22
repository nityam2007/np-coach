"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { startBooking } from "@/app/actions";
import type { FormState } from "@/lib/forms";
import { Turnstile } from "@/components/forms/Turnstile";
import { Button } from "@/components/ui/Button";
import { inputCls } from "@/components/ui/field";
import { useFormErrors } from "@/components/forms/useFormErrors";
import { RouteStopSelect } from "@/components/forms/RouteStopSelect";

import { resolveJourneyOptions } from "@/lib/booking-rules";
import type { ScheduledService } from "@/lib/site-config";
export interface BookingStopOption {
  code: string;
  name: string;
}

const initial: FormState = { ok: false };

function formatGBP(pence: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);
}

function SubmitButton({ total, available, unavailableLabel }: { total: number; available: boolean; unavailableLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || !available}>
      {pending ? "Redirecting to payment…" : available ? `Pay ${formatGBP(total)} & book` : unavailableLabel}
    </Button>
  );
}

export function BookingForm({
  stops,
  services,
  defaultFrom,
  defaultTo,
  defaultDate,
  defaultPassengers,
  defaultReturnDate,
  defaultTripType,
  cancelled,
  bookingsEnabled,
}: {
  stops: BookingStopOption[];
  services: ScheduledService[];
  defaultFrom?: string;
  defaultTo?: string;
  defaultDate?: string;
  defaultPassengers?: number;
  defaultReturnDate?: string;
  defaultTripType?: "single" | "return";
  cancelled?: boolean;
  bookingsEnabled: boolean;
}) {
  const [state, action] = useActionState(startBooking, initial);
  const formRef = useFormErrors(state.errors);
  const initialFrom = defaultFrom ?? stops[0]?.code ?? "";
  const initialTo = defaultTo && defaultTo !== initialFrom ? defaultTo : (stops.find((stop) => stop.code !== initialFrom)?.code ?? "");
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [tripType, setTripType] = useState<"single" | "return">(defaultTripType ?? "single");
  const [passengers, setPassengers] = useState(defaultPassengers && defaultPassengers > 0 ? defaultPassengers : 1);
  const [travelDate, setTravelDate] = useState(defaultDate ?? "");
  const [returnDate, setReturnDate] = useState(defaultReturnDate ?? "");
  const [outwardService, setOutwardService] = useState("");
  const [returnService, setReturnService] = useState("");

  // On success the server returns a Stripe Checkout URL — send the browser there.
  useEffect(() => {
    if (state.ok && state.redirect) window.location.href = state.redirect;
  }, [state]);

  const outwardOptions = travelDate ? resolveJourneyOptions(services, from, to, travelDate) : [];
  const selectedOutward = outwardOptions.find((option) => option.service.code === outwardService) ?? outwardOptions[0];
  const returnOptions = tripType === "return" && returnDate
    ? resolveJourneyOptions(services, to, from, returnDate)
    : [];
  const selectedReturn = returnOptions.find((option) => option.service.code === returnService) ?? returnOptions[0];
  const unit = (selectedOutward?.fare.adult ?? 0) + (tripType === "return" ? selectedReturn?.fare.adult ?? 0 : 0);
  const total = unit * (passengers > 0 ? passengers : 0);
  const sameStop = from === to;
  const hasRequiredServices = Boolean(selectedOutward && (tripType === "single" || selectedReturn));
  const available = Boolean(bookingsEnabled && hasRequiredServices
    && passengers <= (selectedOutward?.service.capacity ?? 0)
    && (!selectedReturn || passengers <= selectedReturn.service.capacity));
  const unavailableLabel = !hasRequiredServices
    ? "Journey unavailable"
    : !bookingsEnabled
      ? "Online booking paused"
      : "Not enough seats";
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

  return (
    <form ref={formRef} action={action} className="grid gap-4">
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
              <span className="text-navy/70">({t === tripType && unit > 0 ? formatGBP(unit) : "select dates"})</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold text-navy">
          Travel date
          <input name="date" type="date" min={today} value={travelDate} onChange={(event) => setTravelDate(event.target.value)} required className={inputCls} />
          {state.errors?.date && (
            <span className="mt-1 block text-xs font-normal text-red-600">{state.errors.date}</span>
          )}
        </label>
        {tripType === "return" && (
          <label className="text-sm font-semibold text-navy">
            Return date
            <input name="returnDate" type="date" min={travelDate || today} value={returnDate} onChange={(event) => setReturnDate(event.target.value)} required className={inputCls} />
            {state.errors?.returnDate && (
              <span className="mt-1 block text-xs font-normal text-red-600">{state.errors.returnDate}</span>
            )}
          </label>
        )}
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

      <fieldset className="grid gap-3 rounded-xl border border-greyblue/20 bg-tint-soft p-4">
        <legend className="px-1 text-sm font-semibold text-navy">Choose outward departure</legend>
        {outwardOptions.length ? outwardOptions.map((option) => (
          <label key={option.service.code} className="flex cursor-pointer items-center justify-between gap-3 rounded-lg bg-white px-4 py-3 text-sm text-navy ring-1 ring-greyblue/20">
            <span className="flex items-center gap-3">
              <input
                type="radio"
                name="outwardService"
                value={option.service.code}
                checked={selectedOutward?.service.code === option.service.code}
                onChange={() => setOutwardService(option.service.code)}
                required
              />
              <span><strong>{option.service.label}</strong><br />{option.departureTime}–{option.arrivalTime}</span>
            </span>
            <strong>{formatGBP(option.fare.adult)}</strong>
          </label>
        )) : <p className="text-sm text-amber-900">No explicitly priced online departure is available for this stop pair and date.</p>}
        {state.errors?.outwardService && <span className="text-xs text-red-600">{state.errors.outwardService}</span>}
      </fieldset>

      {tripType === "return" && (
        <fieldset className="grid gap-3 rounded-xl border border-greyblue/20 bg-tint-soft p-4">
          <legend className="px-1 text-sm font-semibold text-navy">Choose return departure</legend>
          {returnOptions.length ? returnOptions.map((option) => (
            <label key={option.service.code} className="flex cursor-pointer items-center justify-between gap-3 rounded-lg bg-white px-4 py-3 text-sm text-navy ring-1 ring-greyblue/20">
              <span className="flex items-center gap-3">
                <input
                  type="radio"
                  name="returnService"
                  value={option.service.code}
                  checked={selectedReturn?.service.code === option.service.code}
                  onChange={() => setReturnService(option.service.code)}
                  required
                />
                <span><strong>{option.service.label}</strong><br />{option.departureTime}–{option.arrivalTime}</span>
              </span>
              <strong>{formatGBP(option.fare.adult)}</strong>
            </label>
          )) : <p className="text-sm text-amber-900">No explicitly priced return departure is available for this stop pair and date.</p>}
          {state.errors?.returnService && <span className="text-xs text-red-600">{state.errors.returnService}</span>}
        </fieldset>
      )}

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
      <label className="flex items-start gap-3 rounded-lg border border-greyblue/20 bg-tint-soft px-4 py-3 text-sm text-navy/80">
        <input name="termsAccepted" type="checkbox" required className="mt-1" aria-invalid={Boolean(state.errors?.termsAccepted)} />
        <span>
          I agree to the <Link href="/terms" className="font-semibold text-accent underline">booking terms</Link> and have read the <Link href="/privacy-policy" className="font-semibold text-accent underline">privacy policy</Link>, including service, cancellation and refund information.
          {state.errors?.termsAccepted && <span className="mt-1 block text-xs text-red-600">{state.errors.termsAccepted}</span>}
        </span>
      </label>

      {hasRequiredServices && !bookingsEnabled && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
          Online booking is not open for this service yet. Please call us to book while availability is confirmed.
        </p>
      )}
      <SubmitButton total={total} available={available} unavailableLabel={unavailableLabel} />
      <p className="text-xs text-navy/70">
        Payments are processed securely by Stripe. Discounted scheduled tickets are normally non-refundable, except where
        your statutory rights apply. Book at least 1 hour before departure and arrive 15 minutes early.
      </p>
    </form>
  );
}
