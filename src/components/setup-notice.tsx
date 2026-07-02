export default function SetupNotice({ message }: { message: string }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--gradient-site)", display: "flex", alignItems: "center", justifyContent: "center", padding: 32, fontFamily: "var(--font-body)" }}>
      <div style={{ maxWidth: 560, background: "#fff", border: "1px solid var(--slate-200)", borderRadius: 16, boxShadow: "var(--shadow-card)", padding: 32 }}>
        <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 8, fontFamily: "var(--font-heading)" }}>Connect your Vercel account</div>
        <p style={{ fontSize: 14, color: "var(--slate-600)", lineHeight: 1.6, marginBottom: 16 }}>{message}</p>
        <ol style={{ fontSize: 13.5, color: "var(--slate-600)", lineHeight: 1.9, paddingLeft: 18 }}>
          <li>
            Create a token at{" "}
            <code style={{ fontFamily: "var(--font-mono)", background: "var(--slate-100)", padding: "1px 5px", borderRadius: 4 }}>
              vercel.com/account/tokens
            </code>
          </li>
          <li>
            Add it to <code style={{ fontFamily: "var(--font-mono)", background: "var(--slate-100)", padding: "1px 5px", borderRadius: 4 }}>.env.local</code> at the project root:
            <pre
              style={{
                marginTop: 8,
                background: "var(--slate-900)",
                color: "#fff",
                padding: "12px 14px",
                borderRadius: 8,
                fontFamily: "var(--font-mono)",
                fontSize: 12.5,
                overflowX: "auto",
              }}
            >{`VERCEL_TOKEN=your_token_here\nVERCEL_TEAM_ID=team_xxx   # optional, only if the projects live under a team`}</pre>
          </li>
          <li>Restart the dev server (or redeploy).</li>
        </ol>
      </div>
    </div>
  );
}
