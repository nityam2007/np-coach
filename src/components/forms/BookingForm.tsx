"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { startBooking } from "@/app/actions";
import { Turnstile } from "@/components/forms/Turnstile";
import { RouteStopSelect } from "@/components/forms/RouteStopSelect";
import { useFormErrors } from "@/components/forms/useFormErrors";
import { Button } from "@/components/ui/Button";
import { inputCls } from "@/components/ui/field";
import { resolveJourneyOptions, type JourneyOption } from "@/lib/booking-rules";
import type { FormState } from "@/lib/forms";
import type { ScheduledService } from "@/lib/site-config";

export interface BookingStopOption {
  code: string;
  name: string;
  detail: string;
}

type SeatAvailability = Record<string, Record<string, number | null>>;

const initial: FormState = { ok: false };

function formatGBP(pence: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);
}

function formatClock(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return time;
  return new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hourCycle: "h12",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2026, 0, 1, hour, minute)));
}

function formatJourneyDate(date: string) {
  const value = new Date(date + "T12:00:00Z");
  return {
    date: new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(value),
    weekday: new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: "UTC" }).format(value),
  };
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return [hours ? hours + "h" : "", remainder ? remainder + "m" : ""].filter(Boolean).join(" ");
}

function SubmitButton({ total, available, unavailableLabel }: { total: number; available: boolean; unavailableLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || !available}>
      {pending ? "Redirecting to payment…" : available ? "Pay " + formatGBP(total) + " & book" : unavailableLabel}
    </Button>
  );
}

function DepartureOptionCard({
  option,
  date,
  fromStop,
  toStop,
  selected,
  onSelect,
  fieldName,
  remaining,
}: {
  option: JourneyOption;
  date: string;
  fromStop: BookingStopOption;
  toStop: BookingStopOption;
  selected: boolean;
  onSelect: () => void;
  fieldName: "outwardService" | "returnService";
  remaining: number | null | undefined;
}) {
  const formattedDate = formatJourneyDate(date);
  const seatsValue = remaining === undefined
    ? "Checking…"
    : remaining === null
      ? option.service.capacity + " max"
      : remaining + "/" + option.service.capacity;
  const seatsLabel = remaining === null ? "Coach capacity" : "Seats available";

  return (
    <div className={"overflow-hidden rounded-xl bg-white ring-1 transition " + (selected ? "ring-2 ring-accent" : "ring-greyblue/25")}>
      <label className="block cursor-pointer p-4 sm:p-5">
        <span className="flex items-start gap-3">
          <input
            type="radio"
            name={fieldName}
            value={option.service.code}
            checked={selected}
            onChange={onSelect}
            required
            className="mt-1"
          />
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-start justify-between gap-2">
              <span>
                <span className="block text-xs font-bold uppercase tracking-[0.14em] text-accent">{option.service.label}</span>
                <strong className="mt-1 block font-display text-lg text-navy">{option.service.name}</strong>
              </span>
              <span className="text-right text-sm text-navy/70">
                <strong className="block text-navy">{formattedDate.date}</strong>
                {formattedDate.weekday}
              </span>
            </span>

            <span className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <span>
                <strong className="block text-lg text-navy">{formatClock(option.departureTime)}</strong>
                <span className="block text-sm text-navy/70">{fromStop.name}</span>
              </span>
              <span aria-hidden="true" className="h-px w-8 bg-greyblue/60 sm:w-14" />
              <span className="text-right">
                <strong className="block text-lg text-navy">{formatClock(option.arrivalTime)}</strong>
                <span className="block text-sm text-navy/70">{toStop.name}</span>
              </span>
            </span>

            <span className="mt-5 grid gap-3 border-t border-greyblue/20 pt-4 text-sm sm:grid-cols-3">
              <span>
                <span className="block text-xs uppercase tracking-wide text-navy/60">Duration</span>
                <strong className="text-navy">{formatDuration(option.durationMinutes)}</strong>
              </span>
              <span>
                <span className="block text-xs uppercase tracking-wide text-navy/60">{seatsLabel}</span>
                <strong className="text-navy">{seatsValue}</strong>
              </span>
              <span className="sm:text-right">
                <span className="block text-xs uppercase tracking-wide text-navy/60">Fare / seat</span>
                <strong className="text-lg text-navy">{formatGBP(option.fare.adult)}</strong>
              </span>
            </span>
          </span>
        </span>
      </label>

      <details className="border-t border-greyblue/20 px-4 py-3 text-sm text-navy/80 sm:px-5">
        <summary className="cursor-pointer font-semibold text-accent">Boarding &amp; dropping points</summary>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="font-semibold text-navy">Board at {fromStop.name} · {formatClock(option.departureTime)}</dt>
            <dd>{fromStop.detail}</dd>
          </div>
          <div>
            <dt className="font-semibold text-navy">Drop off at {toStop.name} · {formatClock(option.arrivalTime)}</dt>
            <dd>{toStop.detail}</dd>
          </div>
        </dl>
      </details>
    </div>
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
  const [seatAvailability, setSeatAvailability] = useState<SeatAvailability>({});
  const onlineServiceCodes = services
    .filter((service) => service.salesMode === "online")
    .map((service) => service.code)
    .sort()
    .join(",");

  useEffect(() => {
    if (state.ok && state.redirect) window.location.href = state.redirect;
  }, [state]);

  useEffect(() => {
    const dates = [...new Set([
      travelDate,
      tripType === "return" ? returnDate : "",
    ].filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)))];

    if (!dates.length) return;

    const controller = new AbortController();
    const serviceCodes = onlineServiceCodes ? onlineServiceCodes.split(",") : [];

    Promise.all(dates.map(async (date) => {
      try {
        const response = await fetch("/api/daily-express/availability?date=" + encodeURIComponent(date), {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Availability request failed");
        const payload = (await response.json()) as { availability: Record<string, number | null> };
        return [date, payload.availability] as const;
      } catch {
        return [date, Object.fromEntries(serviceCodes.map((code) => [code, null]))] as const;
      }
    })).then((entries) => {
      if (!controller.signal.aborted) setSeatAvailability(Object.fromEntries(entries));
    });

    return () => controller.abort();
  }, [onlineServiceCodes, returnDate, travelDate, tripType]);

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
  const outwardRemaining = selectedOutward ? seatAvailability[travelDate]?.[selectedOutward.service.code] : undefined;
  const returnRemaining = selectedReturn ? seatAvailability[returnDate]?.[selectedReturn.service.code] : undefined;
  const outwardHasSeats = Boolean(selectedOutward)
    && passengers <= (outwardRemaining ?? selectedOutward?.service.capacity ?? 0);
  const returnHasSeats = !selectedReturn
    || passengers <= (returnRemaining ?? selectedReturn.service.capacity);
  const available = Boolean(bookingsEnabled && hasRequiredServices && outwardHasSeats && returnHasSeats);
  const unavailableLabel = !hasRequiredServices
    ? "Journey unavailable"
    : !bookingsEnabled
      ? "Online booking paused"
      : "Not enough seats";
  const todayDate = new Date();
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(todayDate);
  const maxDateValue = new Date(today + "T12:00:00Z");
  maxDateValue.setUTCDate(maxDateValue.getUTCDate() + 180);
  const maxDate = maxDateValue.toISOString().slice(0, 10);
  const outwardFromStop = stops.find((stop) => stop.code === from);
  const outwardToStop = stops.find((stop) => stop.code === to);

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
          {state.errors?.from && <span className="mt-1 block text-xs font-normal text-red-600">{state.errors.from}</span>}
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
          {(["single", "return"] as const).map((type) => (
            <label key={type} className="flex items-center gap-2 font-normal capitalize">
              <input type="radio" name="tripType" value={type} checked={tripType === type} onChange={() => setTripType(type)} />
              {type}
              <span className="text-navy/70">({type === tripType && unit > 0 ? formatGBP(unit) : "select dates"})</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold text-navy">
          Journey date
          <input name="date" type="date" min={today} max={maxDate} value={travelDate} onChange={(event) => setTravelDate(event.target.value)} required className={inputCls} />
          {state.errors?.date && <span className="mt-1 block text-xs font-normal text-red-600">{state.errors.date}</span>}
        </label>
        {tripType === "return" && (
          <label className="text-sm font-semibold text-navy">
            Return date
            <input name="returnDate" type="date" min={travelDate || today} max={maxDate} value={returnDate} onChange={(event) => setReturnDate(event.target.value)} required className={inputCls} />
            {state.errors?.returnDate && <span className="mt-1 block text-xs font-normal text-red-600">{state.errors.returnDate}</span>}
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
            onChange={(event) => setPassengers(Math.max(1, Number(event.target.value) || 1))}
            required
            className={inputCls}
          />
          {state.errors?.passengers && <span className="mt-1 block text-xs font-normal text-red-600">{state.errors.passengers}</span>}
        </label>
      </div>

      <fieldset className="grid gap-3 rounded-2xl border border-greyblue/20 bg-tint-soft p-4 sm:p-5">
        <legend className="px-1 text-sm font-semibold text-navy">Departure bus</legend>
        {!travelDate ? (
          <p className="text-sm text-navy/70">Select your journey date to see departure times and fares.</p>
        ) : outwardOptions.length && outwardFromStop && outwardToStop ? outwardOptions.map((option) => (
          <DepartureOptionCard
            key={option.service.code}
            option={option}
            date={travelDate}
            fromStop={outwardFromStop}
            toStop={outwardToStop}
            selected={selectedOutward?.service.code === option.service.code}
            onSelect={() => setOutwardService(option.service.code)}
            fieldName="outwardService"
            remaining={seatAvailability[travelDate]?.[option.service.code]}
          />
        )) : (
          <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
            No approved online fare is available for this journey and date. Try another stop pair or call us for help.
          </p>
        )}
        {state.errors?.outwardService && <span className="text-xs text-red-600">{state.errors.outwardService}</span>}
      </fieldset>

      {tripType === "return" && (
        <fieldset className="grid gap-3 rounded-2xl border border-greyblue/20 bg-tint-soft p-4 sm:p-5">
          <legend className="px-1 text-sm font-semibold text-navy">Return bus</legend>
          {!returnDate ? (
            <p className="text-sm text-navy/70">Select your return date to see return times and fares.</p>
          ) : returnOptions.length && outwardFromStop && outwardToStop ? returnOptions.map((option) => (
            <DepartureOptionCard
              key={option.service.code}
              option={option}
              date={returnDate}
              fromStop={outwardToStop}
              toStop={outwardFromStop}
              selected={selectedReturn?.service.code === option.service.code}
              onSelect={() => setReturnService(option.service.code)}
              fieldName="returnService"
              remaining={seatAvailability[returnDate]?.[option.service.code]}
            />
          )) : (
            <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
              No approved online fare is available for this return journey and date. Try another date or call us for help.
            </p>
          )}
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
          {state.errors?.email && <span className="mt-1 block text-xs font-normal text-red-600">{state.errors.email}</span>}
        </label>
        <label className="text-sm font-semibold text-navy">
          Phone <span className="font-normal text-navy/70">(optional)</span>
          <input name="phone" type="tel" autoComplete="tel" className={inputCls} />
        </label>
      </div>

      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute left-[-9999px] h-0 w-0" />

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-greyblue/10 px-4 py-3">
        <span className="text-sm text-navy/70">
          {passengers} × {tripType} · {outwardFromStop?.name} → {outwardToStop?.name}
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
