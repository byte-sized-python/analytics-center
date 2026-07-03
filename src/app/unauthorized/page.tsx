import { ALLOWED_EMAIL_DOMAIN } from "@/lib/auth0";

export default function UnauthorizedPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--gradient-site)", display: "flex", alignItems: "center", justifyContent: "center", padding: 32, fontFamily: "var(--font-body)" }}>
      <div style={{ maxWidth: 480, background: "#fff", border: "1px solid var(--slate-200)", borderRadius: 16, boxShadow: "var(--shadow-card)", padding: 32, textAlign: "center" }}>
        <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 8, fontFamily: "var(--font-heading)" }}>Access restricted</div>
        <p style={{ fontSize: 14, color: "var(--slate-600)", lineHeight: 1.6, marginBottom: 20 }}>
          This dashboard is only available to <strong>@{ALLOWED_EMAIL_DOMAIN}</strong> accounts. You&apos;ve been signed out — if you have an organization account, sign in with that instead.
        </p>
        <a
          href="/auth/login"
          style={{
            display: "inline-block",
            border: "1px solid var(--slate-200)",
            background: "var(--bsp-ink)",
            color: "#fff",
            borderRadius: 10,
            padding: "9px 18px",
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Try again
        </a>
      </div>
    </div>
  );
}
