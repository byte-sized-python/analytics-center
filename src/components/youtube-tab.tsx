"use client";

import { useEffect, useRef, useState } from "react";
import type { YoutubeRangeKey, YoutubeViewModel } from "@/lib/youtube-view";
import TrendChart from "@/components/trend-chart";

const RANGE_OPTIONS: { id: YoutubeRangeKey; label: string }[] = [
  { id: "7d", label: "7d" },
  { id: "28d", label: "28d" },
  { id: "90d", label: "90d" },
];

function timeAgo(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days < 1) return "today";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function OAuthSetupCard({ error }: { error: string | null }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.92)", border: "1px solid var(--slate-200)", borderRadius: 16, boxShadow: "var(--shadow-card)", padding: "22px 24px" }}>
      <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 4 }}>Connect deeper channel analytics</div>
      <p style={{ fontSize: 13.5, color: "var(--slate-600)", lineHeight: 1.6, margin: "8px 0 14px" }}>
        {error ?? "Watch time, average view duration, and subscriber gain/loss over time need the YouTube Analytics API (OAuth), separate from the API key above."}
      </p>
      <ol style={{ fontSize: 13, color: "var(--slate-600)", lineHeight: 1.9, paddingLeft: 18 }}>
        <li>
          In the same{" "}
          <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" style={{ color: "var(--bsp-blue)" }}>
            Google Cloud project
          </a>
          , enable the <strong>YouTube Analytics API</strong> and create an <strong>OAuth 2.0 Client ID</strong> (type: Web application).
        </li>
        <li>
          Use{" "}
          <a href="https://developers.google.com/oauthplayground" target="_blank" rel="noreferrer" style={{ color: "var(--bsp-blue)" }}>
            Google OAuth Playground
          </a>{" "}
          (gear icon → use your own OAuth credentials) to authorize scope{" "}
          <code style={{ fontFamily: "var(--font-mono)", background: "var(--slate-100)", padding: "1px 5px", borderRadius: 4 }}>
            https://www.googleapis.com/auth/yt-analytics.readonly
          </code>{" "}
          as the channel owner, then exchange for tokens to get a <strong>refresh token</strong>.
        </li>
        <li>
          Add to <code style={{ fontFamily: "var(--font-mono)", background: "var(--slate-100)", padding: "1px 5px", borderRadius: 4 }}>.env.local</code>:
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
          >{`GOOGLE_OAUTH_CLIENT_ID=your_client_id\nGOOGLE_OAUTH_CLIENT_SECRET=your_client_secret\nGOOGLE_OAUTH_REFRESH_TOKEN=your_refresh_token`}</pre>
        </li>
        <li>Restart the dev server (or redeploy).</li>
      </ol>
    </div>
  );
}

export default function YoutubeTab() {
  const [range, setRange] = useState<YoutubeRangeKey>("28d");
  const [vm, setVm] = useState<YoutubeViewModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const isFirstRun = useRef(true);

  useEffect(() => {
    let cancelled = false;
    if (isFirstRun.current) {
      isFirstRun.current = false;
    } else {
      setLoading(true);
    }
    fetch(`/api/youtube?range=${range}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) setError(data.error);
        else {
          setError(null);
          setVm(data);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load YouTube data.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  if (loading && !vm) {
    return <div style={{ padding: "48px 0", textAlign: "center", color: "var(--slate-400)", fontSize: 13.5 }}>Loading YouTube channel data…</div>;
  }

  if (error) {
    return (
      <div style={{ maxWidth: 560, margin: "40px auto", background: "#fff", border: "1px solid var(--slate-200)", borderRadius: 16, boxShadow: "var(--shadow-card)", padding: 28 }}>
        <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 8, fontFamily: "var(--font-heading)" }}>Connect your YouTube channel</div>
        <p style={{ fontSize: 13.5, color: "var(--slate-600)", lineHeight: 1.6, marginBottom: 14 }}>{error}</p>
        <ol style={{ fontSize: 13, color: "var(--slate-600)", lineHeight: 1.9, paddingLeft: 18 }}>
          <li>
            Create an API key in the{" "}
            <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" style={{ color: "var(--bsp-blue)" }}>
              Google Cloud Console
            </a>{" "}
            with the YouTube Data API v3 enabled.
          </li>
          <li>
            Add to <code style={{ fontFamily: "var(--font-mono)", background: "var(--slate-100)", padding: "1px 5px", borderRadius: 4 }}>.env.local</code>:
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
            >{`YOUTUBE_API_KEY=your_api_key_here\nYOUTUBE_CHANNEL_ID=UCxxxxxxxxxxxxxxxxxx   # or YOUTUBE_HANDLE=@yourhandle`}</pre>
          </li>
          <li>Restart the dev server (or redeploy).</li>
        </ol>
      </div>
    );
  }

  if (!vm) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, opacity: loading ? 0.6 : 1, transition: "opacity .15s var(--ease-smooth)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {vm.channel.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={vm.channel.thumbnail} alt="" width={46} height={46} style={{ borderRadius: 12, flexShrink: 0 }} />
          ) : (
            <span style={{ width: 46, height: 46, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 18, background: "var(--bsp-coral)", color: "#fff", flexShrink: 0 }}>
              YT
            </span>
          )}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.13em", color: "var(--slate-400)", marginBottom: 4 }}>YOUTUBE CHANNEL</div>
            <span style={{ fontWeight: "var(--weight-bold)", fontSize: 26, lineHeight: 1, fontFamily: "var(--font-heading)", letterSpacing: "-0.02em" }}>{vm.channel.title}</span>
          </div>
        </div>
        {vm.analyticsAvailable && (
          <div className="pill-group" style={{ display: "inline-flex", background: "var(--slate-100)", borderRadius: 999, padding: 3, gap: 2 }}>
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setRange(opt.id)}
                className="pill-btn"
                style={{
                  border: "none",
                  cursor: "pointer",
                  padding: "6px 14px",
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: "var(--font-body)",
                  background: range === opt.id ? "#fff" : "transparent",
                  color: range === opt.id ? "var(--bsp-ink)" : "var(--slate-500)",
                  boxShadow: range === opt.id ? "var(--shadow-sm)" : "none",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }} className="kpi-grid">
        {vm.snapshotKpis.map((k) => (
          <div key={k.label} className="hover-lift" style={{ background: "rgba(255,255,255,0.92)", border: "1px solid var(--slate-200)", borderRadius: 16, boxShadow: "var(--shadow-card)", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={{ fontSize: 13, color: "var(--slate-500)", fontWeight: 500 }}>{k.label}</span>
            <span style={{ fontWeight: "var(--weight-bold)", fontSize: 30, lineHeight: 1, fontFamily: "var(--font-heading)", letterSpacing: "-0.02em" }}>{k.value}</span>
          </div>
        ))}
      </div>

      {vm.analyticsAvailable ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }} className="kpi-grid">
            {vm.analyticsKpis.map((k) => (
              <div key={k.label} className="hover-lift" style={{ background: "rgba(255,255,255,0.92)", border: "1px solid var(--slate-200)", borderRadius: 16, boxShadow: "var(--shadow-card)", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
                <span style={{ fontSize: 13, color: "var(--slate-500)", fontWeight: 500 }}>{k.label}</span>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontWeight: "var(--weight-bold)", fontSize: 30, lineHeight: 1, fontFamily: "var(--font-heading)", letterSpacing: "-0.02em" }}>{k.value}</span>
                  <svg viewBox="0 0 120 36" width="88" height="28" preserveAspectRatio="none" style={{ overflow: "visible" }}>
                    <path d={k.sparkArea} fill="rgba(247,93,93,0.12)" />
                    <path d={k.sparkLine} fill="none" stroke="var(--bsp-coral)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
                  </svg>
                </div>
                <span style={k.deltaStyle}>
                  {k.deltaText} <span style={{ color: "var(--slate-400)", fontWeight: 500 }}>{vm.rangeLabel}</span>
                </span>
              </div>
            ))}
          </div>

          <div style={{ background: "rgba(255,255,255,0.92)", border: "1px solid var(--slate-200)", borderRadius: 16, boxShadow: "var(--shadow-card)", padding: "22px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 17 }}>Views &amp; watch time</div>
                <div style={{ fontSize: 12.5, color: "var(--slate-400)" }}>Daily · {vm.channel.title}</div>
              </div>
              <div style={{ display: "flex", gap: 18 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "var(--slate-500)" }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--bsp-coral)" }} />
                  Views
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "var(--slate-500)" }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--bsp-blue)" }} />
                  Watch time
                </span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: 220, padding: "2px 0 22px", textAlign: "right", minWidth: 38 }}>
                {vm.trend.grid.map((g, i) => (
                  <span key={i} style={{ fontSize: 11, color: "var(--slate-400)" }}>
                    {g.label}
                  </span>
                ))}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <TrendChart
                  viewBoxWidth={1000}
                  viewBoxHeight={220}
                  grid={vm.trend.grid}
                  rows={vm.trend.rows}
                  series={[
                    { key: "minutes", color: "var(--bsp-blue)", areaFill: "var(--bsp-blue-100)", line: vm.trend.minutesLine, area: vm.trend.minutesArea, points: vm.trend.minutesPoints },
                    { key: "views", color: "var(--bsp-coral)", areaFill: "rgba(247,93,93,0.12)", line: vm.trend.viewsLine, area: vm.trend.viewsArea, points: vm.trend.viewsPoints },
                  ]}
                />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                  {vm.trend.xlabels.map((xl, i) => (
                    <span key={i} style={{ fontSize: 11, color: "var(--slate-400)" }}>
                      {xl}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <OAuthSetupCard error={vm.analyticsError} />
      )}

      <div style={{ background: "rgba(255,255,255,0.92)", border: "1px solid var(--slate-200)", borderRadius: 16, boxShadow: "var(--shadow-card)", padding: "22px 24px" }}>
        <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 4 }}>Recent uploads</div>
        <div style={{ fontSize: 12.5, color: "var(--slate-400)", marginBottom: 16 }}>Last {vm.videos.length} videos, by views</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {vm.videos.map((v) => (
            <a key={v.id} href={v.url} target="_blank" rel="noreferrer" style={{ display: "flex", gap: 12, textDecoration: "none", color: "inherit", alignItems: "center" }}>
              {v.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={v.thumbnail} alt="" width={96} height={54} style={{ borderRadius: 8, flexShrink: 0, objectFit: "cover" }} />
              ) : (
                <div style={{ width: 96, height: 54, borderRadius: 8, background: "var(--slate-100)", flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--bsp-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.title}</span>
                <span style={{ fontSize: 12, color: "var(--slate-400)" }}>
                  {timeAgo(v.publishedAt)} · {v.viewsFmt} views · {v.likesFmt} likes · {v.commentsFmt} comments
                </span>
                <div style={{ height: 6, borderRadius: 999, background: "var(--slate-100)", overflow: "hidden", maxWidth: 300 }}>
                  <div style={{ height: "100%", borderRadius: 999, background: "var(--bsp-coral)", width: v.pctW, opacity: 0.85 }} />
                </div>
              </div>
            </a>
          ))}
          {vm.videos.length === 0 && <span style={{ fontSize: 12.5, color: "var(--slate-400)" }}>No videos found.</span>}
        </div>
      </div>
    </div>
  );
}
