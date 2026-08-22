import { z } from "zod";
import { directusServerWrite } from "@/lib/directus-server";

/**
 * Server-side form helpers: zod schemas, Cloudflare Turnstile verification, a
 * lightweight rate-limiter, and the Directus write. The app persists submissions
 * to Directus (server-write collections); email delivery (M365 SMTP) is added later.
 */

const DIRECTUS_URL = process.env.DIRECTUS_URL ?? "http://localhost:8055";
const TURNSTILE_SECRET =
  process.env.TURNSTILE_SECRET || process.env.TURNSTILE_SECRET_KEY;

// ---- Validation schemas ----
// `website` is a honeypot: real users leave it blank; bots tend to fill every field.
const honeypot = z.string().max(0, "spam detected").optional().default("");

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(120),
  email: z.string().trim().email("Please enter a valid email").max(200),
  phone: z.string().trim().max(40).optional().default(""),
  subject: z.string().trim().max(160).optional().default(""),
  message: z.string().trim().min(10, "Please tell us a little more (10+ characters)").max(4000),
  website: honeypot,
});

export const quoteSchema = z
  .object({
    name: z.string().trim().min(2, "Please enter your name").max(120),
    email: z.string().trim().email("Please enter a valid email").max(200),
    phone: z.string().trim().min(7, "Please enter a contact number").max(40),
    pickup: z.string().trim().min(2, "Please enter the pickup location").max(200),
    destination: z.string().trim().min(2, "Please enter the destination").max(200),
    outboundDate: z.string().trim().min(1, "Please choose the outward date").max(40),
    returnDate: z.string().trim().max(40).optional().default(""),
    passengers: z.coerce.number().int().min(1, "At least 1 passenger").max(200, "Maximum 200 passengers"),
    coachSize: z.string().trim().max(80).optional().default(""),
    journeyDetails: z
      .string()
      .trim()
      .min(10, "Please tell us a little more about the journey")
      .max(4000),
    website: honeypot,
  })
  .refine((data) => !data.returnDate || data.returnDate >= data.outboundDate, {
    path: ["returnDate"],
    message: "The return date must be on or after the outward date",
  });

// Daily Express booking (P4, stop-to-stop). Amounts/prices are NOT accepted from the
// client — only the From/To stop codes, trip type, date, passenger count and contact.
export const bookingSchema = z
  .object({
    from: z.string().trim().min(1, "Please choose where you're travelling from").max(60),
    to: z.string().trim().min(1, "Please choose your destination").max(60),
    tripType: z.enum(["single", "return"]).default("single"),
    date: z.string().trim().min(1, "Please choose a travel date").max(40),
    returnDate: z.string().trim().max(40).optional().default(""),
    termsAccepted: z.literal("on", { message: "Please accept the booking terms" }),
    passengers: z.coerce.number().int().min(1, "At least 1 passenger").max(50, "Max 50 per booking"),
    name: z.string().trim().min(2, "Please enter your name").max(120),
    email: z.string().trim().email("Please enter a valid email").max(200),
    phone: z.string().trim().max(40).optional().default(""),
    website: honeypot,
  })
  .refine((d) => d.from !== d.to, { path: ["to"], message: "From and To must be different stops" })
  .refine((d) => d.tripType === "single" || Boolean(d.returnDate), { path: ["returnDate"], message: "Please choose a return date" })
  .refine((d) => !d.returnDate || d.returnDate >= d.date, { path: ["returnDate"], message: "Return must be on or after the outward date" });

// Lost Property reclaim pass (P5). Mirrors the live-site form. The fee/VAT are
// NOT accepted from the client — they're computed server-side from CMS pricing.
export const lostPropertySchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(120),
  email: z.string().trim().email("Please enter a valid email").max(200),
  phone: z.string().trim().max(40).optional().default(""),
  travelDate: z.string().trim().min(1, "When did you travel?").max(40),
  travelTime: z.string().trim().max(40).optional().default(""),
  schoolRoute: z
    .union([z.literal("yes"), z.literal("no")])
    .optional()
    .default("no"),
  school: z.string().trim().max(120).optional().default(""),
  route: z.string().trim().max(120).optional().default(""),
  whereLeft: z.string().trim().max(200).optional().default(""),
  itemDescription: z.string().trim().min(3, "Please describe the item").max(2000),
  notes: z.string().trim().max(2000).optional().default(""),
  consentFee: z.literal("on", { message: "Please agree to the £5 + VAT admin fee" }),
  consentData: z.literal("on", { message: "Please agree to how we use your details" }),
  website: honeypot,
});

export type ContactInput = z.infer<typeof contactSchema>;
export type QuoteInput = z.infer<typeof quoteSchema>;
export type BookingInput = z.infer<typeof bookingSchema>;
export type LostPropertyInput = z.infer<typeof lostPropertySchema>;

/** Standard result shape returned to the client form via useActionState. */
export type FormState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
  /** Set by the booking action: the client navigates here (Stripe Checkout URL). */
  redirect?: string;
};

/** Flatten zod issues into a { field: message } map for the UI. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

// ---- Cloudflare Turnstile ----
/**
 * Verify a single-use Turnstile token with Cloudflare's canonical Siteverify API.
 * Local development may omit the secret; production always fails closed.
 */
export async function verifyTurnstile(token: string | undefined, ip?: string): Promise<boolean> {
  if (!TURNSTILE_SECRET) return process.env.NODE_ENV !== "production";
  if (!token || token.length > 2_048) return false;

  try {
    const body = new URLSearchParams({ secret: TURNSTILE_SECRET, response: token });
    if (ip && ip !== "unknown") body.set("remoteip", ip);

    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return false;

    const result = (await res.json()) as { success?: boolean; action?: string };
    return result.success === true && result.action === "npcoaches-form";
  } catch {
    return false;
  }
}

// ---- Directus write ----
/** Create an item in a server-write collection and return its durable id. */
export async function createSubmission(
  collection: string,
  data: Record<string, unknown>,
): Promise<{ id: number } | null> {
  return (await directusServerWrite(`/items/${collection}`, "POST", data)) as { id: number } | null;
}
