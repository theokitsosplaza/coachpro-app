import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

// Routes that never require authentication.
const PUBLIC_PATHS = ["/login", "/api/auth", "/portal/login", "/portal/auth-callback", "/auth-callback", "/set-password"];

// SESSION-DEBUG ──────────────────────────────────────────────────────────────
// Reads the `exp` claim from the Supabase access token currently in cookies,
// BEFORE any refresh. Returns Unix seconds, or null if absent/unreadable.
// Supabase SSR stores the session as base64-<base64url(json)>, optionally
// split across chunks named sb-*-auth-token.0, .1, … (chunker.js MAX=3180).
function readAccessTokenExp(
  cookies: Array<{ name: string; value: string }>
): number | null {
  try {
    const chunks = cookies
      .filter((c) => /sb-.+-auth-token(\.\d+)?$/.test(c.name))
      .sort((a, b) => a.name.localeCompare(b.name));
    if (!chunks.length) return null;
    const combined = chunks.map((c) => c.value).join("");
    const b64 = combined.startsWith("base64-") ? combined.slice(7) : combined;
    const json = Buffer.from(
      b64.replace(/-/g, "+").replace(/_/g, "/"),
      "base64"
    ).toString("utf8");
    const session = JSON.parse(json) as { access_token?: string };
    if (!session.access_token) return null;
    const parts = session.access_token.split(".");
    if (parts.length < 3) return null;
    const payload = JSON.parse(
      Buffer.from(
        parts[1].replace(/-/g, "+").replace(/_/g, "/"),
        "base64"
      ).toString("utf8")
    ) as { exp?: number };
    return payload.exp ?? null;
  } catch {
    return null;
  }
}
// ────────────────────────────────────────────────────────────────────────────

export async function proxy(request: NextRequest) {
  // Must be initialized here so setAll can close over it and reassign.
  let supabaseResponse = NextResponse.next({ request });

  // SESSION-DEBUG ────────────────────────────────────────────────────────────
  // Snapshot expiry BEFORE getUser() so we see whether the token was already
  // expired when the request arrived, not after the refresh.
  const nowSec = Math.floor(Date.now() / 1000);
  const tokenExp = readAccessTokenExp(request.cookies.getAll());
  const secsLeft = tokenExp !== null ? tokenExp - nowSec : null;

  let tokenRefreshed = false;
  let cookiesWrittenToResponse: string[] = [];
  // ──────────────────────────────────────────────────────────────────────────

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // SESSION-DEBUG ────────────────────────────────────────────────────
          tokenRefreshed = true;
          // ──────────────────────────────────────────────────────────────────
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
          // SESSION-DEBUG ────────────────────────────────────────────────────
          // Record what actually landed in the response object.
          cookiesWrittenToResponse = supabaseResponse.cookies
            .getAll()
            .map((c) => c.name);
          // ──────────────────────────────────────────────────────────────────
        },
      },
    }
  );

  // Exchange refresh token if the access token is expired.
  // getUser() makes a network call when needed; getClaims() does not refresh.
  // IMPORTANT: must be awaited before returning supabaseResponse.
  const { data: { user }, error } = await supabase.auth.getUser();

  // Redirect unauthenticated requests away from protected routes.
  // Runs AFTER token refresh so a valid-but-expired token is refreshed
  // before we decide whether the user is logged in.
  const pathname = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  // SESSION-DEBUG ────────────────────────────────────────────────────────────
  console.log(
    "SESSION-DEBUG " +
      JSON.stringify({
        ts: new Date().toISOString(),
        path: pathname,
        // secsLeft: seconds until token expiry when request arrived.
        //   positive → token still valid (no refresh needed yet)
        //   ≤90      → within the 90s EXPIRY_MARGIN; refresh will be attempted
        //   negative → token was already expired when request hit the proxy
        //   null     → no Supabase token found in cookies at all
        secsLeft,
        tokenExp,
        authed: !!user,
        getErr: error?.message ?? null,
        // refreshed: true means setAll fired, i.e. the library exchanged the
        // refresh token and tried to write new cookies.
        refreshed: tokenRefreshed,
        // cookiesInResponse: the cookie names written into supabaseResponse.
        //   Non-empty + refreshed:true  → new tokens ARE going to the browser ✓
        //   Empty     + refreshed:true  → refresh happened but cookies weren't
        //                                 written to the response object ✗
        //   Empty     + refreshed:false → no refresh was attempted
        cookiesInResponse: cookiesWrittenToResponse,
        willRedirect: !isPublic && !user,
      })
  );
  // ──────────────────────────────────────────────────────────────────────────

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
