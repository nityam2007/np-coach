import { NextResponse } from "next/server";
import { revokeSession, sessionCookieName } from "@/lib/auth-store";

/** Full-page POST logout: clears the host-only session cookie and redirects safely. */
export async function POST() {
  await revokeSession();
  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: "/account/login?signed_out=1" },
  });
  response.cookies.set({
    name: sessionCookieName(),
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
    priority: "high",
  });
  return response;
}
