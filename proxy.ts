import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

// Routes that never require authentication.
const PUBLIC_PATHS = ["/login", "/api/auth", "/portal/login", "/portal/auth-callback", "/auth-callback", "/set-password"];

export async function proxy(request: NextRequest) {
  // Must be initialized here so setAll can close over it and reassign.
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // 1. Forward updated cookies onto the outgoing request object so
          //    any downstream Server Component sees the refreshed token.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // 2. Rebuild the response so the updated cookies reach the browser.
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Exchange refresh token if the access token is expired.
  // getUser() makes a network call when needed; getClaims() does not refresh.
  // IMPORTANT: must be awaited before returning supabaseResponse.
  //
  // getUser() only *throws* on infrastructure failure (Auth host unreachable,
  // timeout, 5xx) — an ordinary missing/invalid session resolves to
  // { data: { user: null } } and is handled by the redirect logic below. Since
  // this proxy runs on nearly every route, an unhandled throw would 500 the
  // entire app (including the login pages) during a transient Auth outage.
  // Fail OPEN: on throw, let the request proceed untouched. This is safe
  // because the proxy is not the security boundary — every data-bearing route
  // re-validates the JWT locally via getClaims() (in lib/dal.ts and the API
  // route handlers), which needs no network round-trip. A still-valid token
  // keeps working; an absent/expired one is rejected downstream by getClaims().
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (err) {
    console.error(
      "[proxy] supabase.auth.getUser() failed; proceeding without a proxy-level auth gate (downstream getClaims() still enforces):",
      err
    );
    return supabaseResponse;
  }

  // Redirect unauthenticated requests away from protected routes.
  // Runs AFTER token refresh so a valid-but-expired token is refreshed
  // before we decide whether the user is logged in.
  const pathname = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  if (!isPublic && !user) {
    // Portal paths land at /portal/login; all other protected paths at /login.
    const isPortalPath = pathname === "/portal" || pathname.startsWith("/portal/");
    return NextResponse.redirect(
      new URL(isPortalPath ? "/portal/login" : "/login", request.url)
    );
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Run on all routes except Next.js internals and static files.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
