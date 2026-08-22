import crypto from "node:crypto";

export interface TicketClaims { reference: string; from: string; to: string; date: string | null }

function secret(): string {
  const value = process.env.TICKET_SIGNING_SECRET || process.env.AUTH_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV === "production") throw new Error("TICKET_SIGNING_SECRET or AUTH_SECRET must be configured");
  return "np-coaches-dev-ticket-secret";
}

export function signTicket(claims: TicketClaims): string {
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyTicket(token: string): TicketClaims | null {
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;
  const expected = crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString()) as TicketClaims;
    return claims.reference && claims.from && claims.to ? claims : null;
  } catch { return null; }
}
