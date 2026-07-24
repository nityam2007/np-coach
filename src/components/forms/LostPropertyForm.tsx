"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { startPassPurchase } from "@/app/actions";
import type { FormState } from "@/lib/forms";
import { Turnstile } from "@/components/forms/Turnstile";
import { Button } from "@/components/ui/Button";
import { inputCls } from "@/components/ui/field";

const initial: FormState = { ok: false };

const schools = ["Pioneer Secondary (Khalsa) Academy", "Herschel Grammar School", "None"];
const routes = ["PSA Langley", "PSA Burnham", "HGS XR1", "HGS XR2", "HGS XR3", "HGS S", "HGS N", "None"];

function formatGBP(pence: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);
}

function SubmitButton({ fee }: { fee: number }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Redirecting to payment…" : `Pay ${formatGBP(fee)} & submit`}
    </Button>
  );
}

export function LostPropertyForm({
  fee,
  vatRate,
  cancelled,
}: {
  fee: number;
  vatRate: number;
  cancelled?: boolean;
}) {
  const [state, action] = useActionState(startPassPurchase, initial);
  const [schoolRoute, setSchoolRoute] = useState<"yes" | "no">("no");

  useEffect(() => {
    if (state.ok && state.redirect) window.location.href = state.redirect;
  }, [state]);

  return (
    <form action={action} className="grid gap-4">
      {cancelled && !state.message && (
        <p className="rounded-lg bg-greyblue/15 px-4 py-2 text-sm text-navy">
          Payment cancelled — nothing was charged. You can try again below.
        </p>
      )}
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

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold text-navy">
          Travel date
          <input name="travelDate" type="date" required className={inputCls} />
          {state.errors?.travelDate && (
            <span className="mt-1 block text-xs font-normal text-red-600">{state.errors.travelDate}</span>
          )}
        </label>
        <label className="text-sm font-semibold text-navy">
          Approx. time <span className="font-normal text-navy/70">(optional)</span>
          <input name="travelTime" type="text" placeholder="e.g. 3:15 PM" className={inputCls} />
        </label>
      </div>

      <fieldset className="text-sm font-semibold text-navy">
        <legend>Was this on a Home to School route?</legend>
        <div className="mt-2 flex gap-4">
          {(["no", "yes"] as const).map((v) => (
            <label key={v} className="flex items-center gap-2 font-normal capitalize">
              <input
                type="radio"
                name="schoolRoute"
                value={v}
                checked={schoolRoute === v}
                onChange={() => setSchoolRoute(v)}
              />
              {v}
            </label>
          ))}
        </div>
      </fieldset>

      {schoolRoute === "yes" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-navy">
            School
            <select name="school" defaultValue="None" className={inputCls}>
              {schools.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-navy">
            Route
            <select name="route" defaultValue="None" className={inputCls}>
              {routes.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <label className="text-sm font-semibold text-navy">
        Where was it left on the vehicle? <span className="font-normal text-navy/70">(optional)</span>
        <input name="whereLeft" type="text" placeholder="e.g. overhead shelf, seat pocket" className={inputCls} />
      </label>

      <label className="text-sm font-semibold text-navy">
        Item description
        <textarea name="itemDescription" required rows={3} placeholder="Describe the lost item" className={inputCls} />
        {state.errors?.itemDescription && (
          <span className="mt-1 block text-xs font-normal text-red-600">{state.errors.itemDescription}</span>
        )}
      </label>

      <label className="text-sm font-semibold text-navy">
        Additional information <span className="font-normal text-navy/70">(optional)</span>
        <textarea name="notes" rows={2} className={inputCls} />
      </label>

      <label className="flex items-start gap-2 text-sm text-navy/80">
        <input type="checkbox" name="consentFee" className="mt-1" />
        <span>
          I agree there is a <strong>{formatGBP(fee)}</strong> admin charge ({formatGBP(fee - Math.round((fee * vatRate) / (100 + vatRate)))} + VAT) for reclaimed lost property.
        </span>
      </label>
      {state.errors?.consentFee && <span className="-mt-2 text-xs text-red-600">{state.errors.consentFee}</span>}

      <label className="flex items-start gap-2 text-sm text-navy/80">
        <input type="checkbox" name="consentData" className="mt-1" />
        <span>
          I agree to NP Coaches using my details only to reclaim this property; they will be held for up to one month
          and then cleared.
        </span>
      </label>
      {state.errors?.consentData && <span className="-mt-2 text-xs text-red-600">{state.errors.consentData}</span>}

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
      <SubmitButton fee={fee} />
      <p className="text-xs text-navy/70">
        The fee is payable to register your claim and covers handling and storage. Payments are processed securely by
        Stripe.
      </p>
    </form>
  );
}
