import { NextRequest, NextResponse } from "next/server";
import { auth0, isAllowedEmail, isAuth0Configured } from "@/lib/auth0";

// Fail closed: if Auth0 env vars aren't set yet, don't let anyone through —
// and don't call into the SDK, which throws on missing config.
function notConfiguredResponse(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Auth0 is not configured yet." }, { status: 503 });
  }
  return new NextResponse(
    "<!doctype html><html><body style=\"font-family:sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;color:#334155\"><p>Auth0 isn't configured yet. Set AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, and AUTH0_SECRET in .env.local.</p></body></html>",
    { status: 503, headers: { "content-type": "text/html" } }
  );
}

export async function proxy(request: NextRequest) {
  if (!isAuth0Configured()) {
    return notConfiguredResponse(request);
  }

  const authRes = await auth0.middleware(request);

  // Let the SDK's own routes (/auth/login, /auth/callback, /auth/logout, ...) through as-is.
  if (request.nextUrl.pathname.startsWith("/auth/")) {
    return authRes;
  }

  // Unauthorized page must stay reachable even for a signed-out/blocked user.
  if (request.nextUrl.pathname === "/unauthorized") {
    return authRes;
  }

  const session = await auth0.getSession(request);

  if (!session) {
    const loginUrl = new URL("/auth/login", request.nextUrl.origin);
    loginUrl.searchParams.set("returnTo", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  if (!isAllowedEmail(session.user.email, session.user.email_verified)) {
    const logoutUrl = new URL("/auth/logout", request.nextUrl.origin);
    logoutUrl.searchParams.set("returnTo", "/unauthorized");
    return NextResponse.redirect(logoutUrl);
  }

  return authRes;
}

export const config = {
  matcher: [
    // Run on everything (pages + API routes) except static assets, so the
    // dashboard's data endpoints are gated the same way as the UI.
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
