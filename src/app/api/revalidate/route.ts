import crypto from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

const allowedCollections = new Set([
  "settings", "services", "fleet", "pages", "tours", "routes", "stops",
  "school_routes", "blog_posts", "testimonials",
]);

function authorised(request: Request): boolean {
  const secret = process.env.REVALIDATION_SECRET;
  const supplied = request.headers.get("x-revalidation-secret") ?? "";
  if (!secret || supplied.length !== secret.length) return false;
  return crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(secret));
}

export async function POST(request: Request) {
  if (!authorised(request)) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const body = await request.json().catch(() => null) as { collection?: string; key?: string } | null;
  if (!body?.collection || !allowedCollections.has(body.collection)) {
    return NextResponse.json({ error: "unsupported collection" }, { status: 400 });
  }
  revalidateTag(body.collection, "max");
  if (body.key) revalidateTag(`${body.collection}:${body.key.slice(0, 120)}`, "max");
  return NextResponse.json({ revalidated: true, collection: body.collection });
}
