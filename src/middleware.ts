import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Hostname that should serve the Kith guest guide at its root.
// e.g. kith.mkguirguis.com/ internally renders /g/kith-1423.
const GUIDE_HOSTS: Record<string, string> = {
  "kith.mkguirguis.com": "/g/kith-1423",
};

// NOTE: We cannot import `auth` from `@/lib/auth` here because it
// pulls in `postgres` (Node.js-only) which is incompatible with
// the Edge Runtime that middleware runs in.
//
// Instead, we check for the session cookie directly. The actual
// auth validation happens in the server components via requireAuth().

export function middleware(request: NextRequest) {
  // Serve the guest guide at the root of a dedicated guide hostname, keeping
  // the visible URL as the bare host. Behind a reverse proxy, request.nextUrl
  // reflects the internal URL, so read the forwarded Host header.
  const hostHeader = (request.headers.get("host") ?? "").split(":")[0].toLowerCase();
  const guidePath = GUIDE_HOSTS[hostHeader];
  if (guidePath) {
    const { pathname, search } = request.nextUrl;
    if (pathname === "/" || pathname === "") {
      return NextResponse.rewrite(new URL(guidePath + search, request.url));
    }
    return NextResponse.next();
  }

  const sessionCookie =
    request.cookies.get("authjs.session-token") ??
    request.cookies.get("__Secure-authjs.session-token");

  const isLoggedIn = !!sessionCookie;
  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");
  const isCleanerRoute = request.nextUrl.pathname.startsWith("/cleaner");
  const isOwnerRoute = request.nextUrl.pathname.startsWith("/owner");
  const isLoginPage = request.nextUrl.pathname === "/login";

  if ((isAdminRoute || isCleanerRoute || isOwnerRoute) && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isLoginPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/admin/:path*", "/cleaner/:path*", "/owner/:path*", "/login"],
};
