import { Icon } from "@/components/ui/Icon";
import type { BoardingPassData } from "@/lib/ticket";

function Field({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-navy/70">{label}</p>
      <p className="mt-0.5 font-semibold text-navy">{value}</p>
    </div>
  );
}

/**
 * Flight-boarding-pass–style ticket. Pure presentational + self-contained (inline SVG
 * icons + a same-origin QR data URL only — no remote images), so html-to-image can
 * rasterise it cleanly for PNG/PDF export. Give it a stable DOM id for capture.
 */
export function BoardingPass({ data, domId }: { data: BoardingPassData; domId?: string }) {
  const trip = data.tripType === "return" ? "Return" : "Single";
  return (
    <div
      id={domId}
      className="mx-auto w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-navy/10"
    >
      <div className="flex items-center justify-between bg-navy px-6 py-4 text-offwhite">
        <span className="flex items-center gap-2 font-display text-lg font-bold">
          <Icon name="bus" className="h-6 w-6" />
          {data.siteName}
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-greyblue">Boarding Pass</span>
      </div>

      <div className="flex flex-col sm:flex-row">
        <div className="flex-1 p-6">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-accent">Daily Express</p>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-navy/70">From</p>
              <p className="truncate font-display text-xl font-bold text-navy sm:text-2xl">{data.fromName}</p>
            </div>
            <Icon name="bus" className="h-6 w-6 shrink-0 text-accent" />
            <div className="min-w-0 text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-navy/70">To</p>
              <p className="truncate font-display text-xl font-bold text-navy sm:text-2xl">{data.toName}</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
            <Field label="Date" value={data.date ?? "—"} />
            <Field label="Service" value={data.serviceName} />
            <Field label="Departs" value={data.departureTime} />
            <Field label="Arrives" value={data.arrivalTime} />
            <Field label="Trip" value={trip} />
            <Field label="Passengers" value={data.passengers} />
            <Field label="Passenger" value={data.passengerName} />
            {data.amountLabel && <Field label="Paid" value={data.amountLabel} />}
          </div>
        </div>

          {data.returnLeg && (
            <div className="mt-5 rounded-xl bg-greyblue/10 p-4 text-sm text-navy">
              <p className="font-semibold">Return · {data.returnLeg.serviceName}</p>
              <p className="mt-1 text-navy/70">
                {data.returnLeg.date} · {data.returnLeg.departureTime}–{data.returnLeg.arrivalTime}
              </p>
            </div>
          )}

        {/* Tear-off stub */}
        <div className="flex flex-col items-center justify-center gap-3 border-t border-dashed border-greyblue/50 bg-greyblue/5 p-6 sm:w-56 sm:border-l sm:border-t-0">
          {/* eslint-disable-next-line @next/next/no-img-element -- data URL, must be captured by html-to-image */}
          <img src={data.qrDataUrl} alt={`QR code for booking ${data.reference}`} className="h-32 w-32" />
          <div className="text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-navy/70">Booking ref</p>
            <p className="font-mono text-sm font-bold text-navy">{data.reference}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
