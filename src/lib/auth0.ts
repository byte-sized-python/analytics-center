import { Auth0Client } from "@auth0/nextjs-auth0/server";

// Restricts sign-in to a single email domain. Enforced on every request in
// proxy.ts (not just at the login screen) so a token from any other Auth0
// connection/tenant can't be replayed to reach the app.
export const ALLOWED_EMAIL_DOMAIN = "bytesizedpython.org";

export function isAuth0Configured() {
  return Boolean(process.env.AUTH0_DOMAIN && process.env.AUTH0_CLIENT_ID && process.env.AUTH0_CLIENT_SECRET && process.env.AUTH0_SECRET);
}

export const auth0 = new Auth0Client();

export function isAllowedEmail(email: string | null | undefined, emailVerified: boolean | undefined) {
  if (!email || !emailVerified) return false;
  return email.toLowerCase().endsWith(`@${ALLOWED_EMAIL_DOMAIN}`);
}
