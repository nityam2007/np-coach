import { NextResponse, type NextRequest } from "next/server";
import { sessionCookieName } from "@/lib/auth";

/** Full-page POST logout: clears the host-only session cookie and redirects safely. */
export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(
    new URL("/account/login?signed_out=1", request.url),
    303,
  );
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
