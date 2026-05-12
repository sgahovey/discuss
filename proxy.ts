import { getSessionCookie } from "better-auth/cookies";
import { NextRequest, NextResponse } from "next/server";

const AUTH_ROUTES = ["/login", "/register"];
const PUBLIC_AUTH_LANDING = "/login";

export function proxy(request: NextRequest) {
  const session = getSessionCookie(request);
  const { pathname } = request.nextUrl;

  // Non connecte → /chat renvoie vers /login
  if (pathname.startsWith("/chat") && !session) {
    return NextResponse.redirect(new URL(PUBLIC_AUTH_LANDING, request.url));
  }

  // Deja connecte → / et pages d'auth renvoient vers /chat
  if (session && (pathname === "/" || AUTH_ROUTES.includes(pathname))) {
    return NextResponse.redirect(new URL("/chat", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/chat/:path*", "/login", "/register"],
};
