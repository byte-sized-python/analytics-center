"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SiteMeta } from "@/lib/command-center-data";
import { RANGE_META, type CommandCenterViewModel, type RangeKey } from "@/lib/analytics-view";
import { worldDots } from "@/lib/world-dots";

const RANGE_OPTIONS: { id: RangeKey; label: string }[] = [
  { id: "24h", label: "24h" },
  { id: "7d", label: "7d" },
  { id: "30d", label: "30d" },
];

const DOTS = worldDots();

function Logo() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="8" fill="var(--bsp-ink)" />
      <path d="M14 6 L21 20 H7 Z" fill="var(--bsp-yellow)" />
    </svg>
  );
}

function exportCsv(vm: CommandCenterViewModel) {
  const rows = [
    ["bucket", "pageviews", "visitors"],
    ...vm.trend.rows.map((r) => [r.label, String(r.pageviews), String(r.visitors)]),
  ];
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${vm.site.name}-analytics-${vm.range}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function CommandCenter({
  sites,
  initialSiteId,
  initialRange,
  initialView,
}: {
  sites: SiteMeta[];
  initialSiteId: string;
  initialRange: RangeKey;
  initialView: CommandCenterViewModel;
}) {
  const [siteId, setSiteId] = useState(initialSiteId);
  const [range, setRange] = useState<RangeKey>(initialRange);
  const [vm, setVm] = useState<CommandCenterViewModel>(initialView);
  const [loading, setLoading] = useState(false);
  const [minutesAgo, setMinutesAgo] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isFirstRun = useRef(true);

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/command-center?siteId=${encodeURIComponent(siteId)}&range=${range}`)
      .then((r) => r.json())
      .then((data: CommandCenterViewModel) => {
        if (!cancelled) setVm(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [siteId, range]);

  useEffect(() => {
    const tick = () => setMinutesAgo(Math.max(0, Math.round((Date.now() - vm.fetchedAt) / 60000)));
    const id = setInterval(tick, 30000);
    tick();
    return () => clearInterval(id);
  }, [vm.fetchedAt]);

  const domain = useMemo(() => sites.find((s) => s.id === siteId)?.domain ?? "", [sites, siteId]);
  const statusGood = vm.site.latestDeploymentState === "READY" || vm.site.latestDeploymentState === null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--gradient-site)", fontFamily: "var(--font-body)", color: "var(--bsp-ink)" }}>
      {/* sticky topbar */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: "14px 32px",
          background: "rgba(255,255,255,0.82)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          borderBottom: "1px solid var(--slate-200)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0, flex: 1 }}>
          <button
            onClick={() => setSidebarOpen(true)}
            className="mobile-menu-btn"
            style={{
              display: "none",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              padding: 8,
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--bsp-ink)" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <Logo />
          <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: "-0.01em", whiteSpace: "nowrap" }} className="analytics-title">Analytics</span>
          <span style={{ width: 1, height: 24, background: "var(--slate-200)", margin: "0 4px", flexShrink: 0 }} />
          <div style={{ display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none", msOverflowStyle: "none", flex: 1, minWidth: 0, paddingBottom: 2 }} className="desktop-site-selector">
            {vm.sites.map((st) => (
              <button
                key={st.id}
                onClick={() => setSiteId(st.id)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "6px 14px 6px 6px",
                  borderRadius: 999,
                  cursor: "pointer",
                  fontFamily: "var(--font-body)",
                  border: st.active ? "1px solid var(--bsp-blue)" : "1px solid var(--slate-200)",
                  background: st.active ? "var(--bsp-blue-100)" : "#fff",
                  boxShadow: st.active ? "var(--shadow-sm)" : "none",
                  flexShrink: 0,
                }}
              >
                <span style={st.tileStyle}>{st.initials}</span>
                <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1.15 }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: "var(--bsp-ink)" }}>{st.name}</span>
                  <span style={{ fontSize: 11, color: "var(--slate-400)" }}>{st.visitorsFmt} visitors</span>
                </span>
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <div style={{ display: "inline-flex", background: "var(--slate-100)", borderRadius: 999, padding: 3, gap: 2 }}>
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setRange(opt.id)}
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
          <button
            onClick={() => exportCsv(vm)}
            style={{
              border: "1px solid var(--slate-200)",
              background: "#fff",
              borderRadius: 10,
              padding: "9px 16px",
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "var(--font-body)",
              cursor: "pointer",
              color: "var(--bsp-ink)",
            }}
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <>
          <div
            onClick={() => setSidebarOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              zIndex: 49,
            }}
          />
          <div
            className="mobile-sidebar"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              bottom: 0,
              width: 280,
              background: "#fff",
              zIndex: 50,
              padding: 20,
              boxShadow: "var(--shadow-hero)",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 18 }}>Select Site</span>
              <button
                onClick={() => setSidebarOpen(false)}
                style={{ border: "none", background: "transparent", cursor: "pointer", padding: 8 }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--bsp-ink)" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {vm.sites.map((st) => (
                <button
                  key={st.id}
                  onClick={() => {
                    setSiteId(st.id);
                    setSidebarOpen(false);
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    borderRadius: 12,
                    cursor: "pointer",
                    fontFamily: "var(--font-body)",
                    border: st.active ? "1px solid var(--bsp-blue)" : "1px solid var(--slate-200)",
                    background: st.active ? "var(--bsp-blue-100)" : "#fff",
                    boxShadow: st.active ? "var(--shadow-sm)" : "none",
                    textAlign: "left",
                  }}
                >
                  <span style={st.tileStyle}>{st.initials}</span>
                  <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1.15 }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: "var(--bsp-ink)" }}>{st.name}</span>
                    <span style={{ fontSize: 12, color: "var(--slate-400)" }}>{st.visitorsFmt} visitors</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        @media (max-width: 768px) {
          div[style*="position: sticky"] {
            gap: 12px !important;
            padding: 12px 16px !important;
          }
          div[style*="display: flex"][style*="align-items: center"][style*="gap: 14"] {
            flex-wrap: wrap !important;
          }
          .analytics-title {
            display: none !important;
          }
          .mobile-menu-btn {
            display: block !important;
          }
          .desktop-site-selector {
            display: none !important;
          }
          .mobile-sidebar {
            animation: slideIn 0.3s ease-out !important;
          }
          @keyframes slideIn {
            from {
              transform: translateX(-100%);
            }
            to {
              transform: translateX(0);
            }
          }
          div[style*="display: inline-flex"][style*="background: var(--slate-100)"] {
            flex: 1 !important;
            justify-content: center !important;
          }
          button[style*="padding: \"6px 14px\""] {
            padding: 6px 10px !important;
            font-size: 12px !important;
          }
          .kpi-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .main-grid {
            grid-template-columns: 1fr !important;
          }
          .bottom-grid {
            grid-template-columns: 1fr !important;
          }
          .main-container {
            padding: 20px 16px 48px !important;
          }
          .page-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 16px !important;
          }
        }
        @media (max-width: 1024px) {
          .kpi-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 480px) {
          .kpi-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <div style={{ maxWidth: 1440, margin: "0 auto", padding: "26px 32px 72px", display: "flex", flexDirection: "column", gap: 18, opacity: loading ? 0.6 : 1, transition: "opacity .15s var(--ease-smooth)" }} className="main-container">
        {/* page header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }} className="page-header">
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 18,
                flexShrink: 0,
                background: vm.site.color,
                color: vm.site.textOn,
              }}
            >
              {vm.site.initials}
            </span>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.13em", color: "var(--slate-400)", marginBottom: 4 }}>
                {vm.rangeUpper} · UPDATED {minutesAgo} MIN AGO{loading ? " · UPDATING…" : ""}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontWeight: "var(--weight-bold)", fontSize: 26, lineHeight: 1, fontFamily: "var(--font-heading)", letterSpacing: "-0.02em" }}>
                  {vm.site.name}
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--slate-400)" }}>{domain}</span>
              </div>
            </div>
          </div>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12.5,
              fontWeight: 600,
              color: "var(--slate-600)",
              background: "#fff",
              border: "1px solid var(--slate-200)",
              borderRadius: 999,
              padding: "7px 14px",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="var(--bsp-ink)">
              <path d="M12 2 22 20H2 Z" />
            </svg>
            Deployed on Vercel
            <span style={{ width: 7, height: 7, borderRadius: 999, background: statusGood ? "var(--success)" : "var(--danger)" }} />
          </span>
        </div>

        {/* KPI row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }} className="kpi-grid">
          {vm.kpis.map((k) => (
            <div key={k.label} className="hover-lift" style={{ background: "rgba(255,255,255,0.92)", border: "1px solid var(--slate-200)", borderRadius: 16, boxShadow: "var(--shadow-card)", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
              <span style={{ fontSize: 13, color: "var(--slate-500)", fontWeight: 500 }}>{k.label}</span>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontWeight: "var(--weight-bold)", fontSize: 30, lineHeight: 1, fontFamily: "var(--font-heading)", letterSpacing: "-0.02em" }}>{k.value}</span>
                <svg viewBox="0 0 120 36" width="88" height="28" preserveAspectRatio="none" style={{ overflow: "visible" }}>
                  <path d={k.sparkArea} fill="var(--bsp-blue-100)" />
                  <path d={k.sparkLine} fill="none" stroke="var(--bsp-blue)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
                </svg>
              </div>
              <span style={k.deltaStyle}>
                {k.deltaText} <span style={{ color: "var(--slate-400)", fontWeight: 500 }}>{vm.rangeLabel}</span>
              </span>
            </div>
          ))}
        </div>

        {/* main grid */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }} className="main-grid">
          <div style={{ background: "rgba(255,255,255,0.92)", border: "1px solid var(--slate-200)", borderRadius: 16, boxShadow: "var(--shadow-card)", padding: "22px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 17 }}>Traffic over time</div>
                <div style={{ fontSize: 12.5, color: "var(--slate-400)" }}>{RANGE_META[range].grain === "hour" ? "Hourly" : "Daily"} · {vm.site.name}</div>
              </div>
              <div style={{ display: "flex", gap: 18 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "var(--slate-500)" }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--bsp-blue)" }} />
                  Visitors
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "var(--slate-500)" }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--bsp-yellow-2)" }} />
                  Page views
                </span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: 260, padding: "2px 0 22px", textAlign: "right", minWidth: 38 }}>
                {vm.trend.grid.map((g, i) => (
                  <span key={i} style={{ fontSize: 11, color: "var(--slate-400)" }}>
                    {g.label}
                  </span>
                ))}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <svg viewBox="0 0 1000 240" width="100%" height="260" preserveAspectRatio="none" style={{ display: "block" }}>
                  {vm.trend.grid.map((g, i) => (
                    <line key={i} x1="0" y1={g.y} x2="1000" y2={g.y} stroke="var(--slate-200)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                  ))}
                  <path d={vm.trend.pvArea} fill="var(--bsp-yellow-20)" />
                  <path d={vm.trend.pvLine} fill="none" stroke="var(--bsp-yellow-2)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
                  <path d={vm.trend.visArea} fill="var(--bsp-blue-100)" />
                  <path d={vm.trend.visLine} fill="none" stroke="var(--bsp-blue)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
                </svg>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                  {vm.trend.xlabels.map((xl, i) => (
                    <span key={i} style={{ fontSize: 11, color: "var(--slate-400)" }}>
                      {xl}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            {vm.trend.rows.length === 0 && (
              <div style={{ fontSize: 12.5, color: "var(--slate-400)", marginTop: 10 }}>
                No Web Analytics data yet — make sure Web Analytics is enabled for this project.
              </div>
            )}
          </div>

          <div style={{ background: "rgba(255,255,255,0.92)", border: "1px solid var(--slate-200)", borderRadius: 16, boxShadow: "var(--shadow-card)", padding: "22px 24px", display: "flex", flexDirection: "column" }}>
            <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 2 }}>Traffic sources</div>
            <div style={{ fontSize: 12.5, color: "var(--slate-400)", marginBottom: 12 }}>Share of visitors</div>
            <div style={{ display: "flex", alignItems: "center", gap: 20, flex: 1 }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <svg viewBox="0 0 140 140" width="140" height="140">
                  <circle cx="70" cy="70" r="54" fill="none" stroke="var(--slate-100)" strokeWidth="20" />
                  {vm.sources.map((s, i) => (
                    <circle key={i} cx="70" cy="70" r="54" fill="none" stroke={s.color} strokeWidth="20" strokeDasharray={s.dash} strokeDashoffset={s.offset} transform="rotate(-90 70 70)" strokeLinecap="butt" />
                  ))}
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontWeight: 700, fontSize: 21, lineHeight: 1 }}>{vm.site.pageviewsFmt}</span>
                  <span style={{ fontSize: 11, color: "var(--slate-400)" }}>views</span>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
                {vm.sources.map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: "var(--slate-600)", flex: 1 }}>{s.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{s.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* bottom grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1.35fr 1fr", gap: 16 }} className="bottom-grid">
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="hover-lift" style={{ background: "rgba(255,255,255,0.92)", border: "1px solid var(--slate-200)", borderRadius: 16, boxShadow: "var(--shadow-card)", padding: "18px 20px" }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Visitors by site</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                {vm.compare.map((c, i) => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                      <span style={{ color: c.labelColor, fontWeight: c.weight as never }}>{c.name}</span>
                      <span style={{ fontWeight: 700, color: c.labelColor }}>{c.valueFmt}</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 999, background: "var(--slate-100)", overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 999, background: c.barColor, width: c.pctW }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="hover-lift" style={{ background: "rgba(255,255,255,0.92)", border: "1px solid var(--slate-200)", borderRadius: 16, boxShadow: "var(--shadow-card)", padding: "18px 20px" }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Devices</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {vm.devices.map((d, i) => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                      <span style={{ color: "var(--slate-600)" }}>{d.label}</span>
                      <span style={{ fontWeight: 700 }}>{d.value}%</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 999, background: "var(--slate-100)", overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 999, background: d.color, width: d.pctW }} />
                    </div>
                  </div>
                ))}
                {vm.devices.length === 0 && <span style={{ fontSize: 12.5, color: "var(--slate-400)" }}>No data yet.</span>}
              </div>
            </div>
          </div>

          <div className="hover-lift" style={{ background: "rgba(255,255,255,0.92)", border: "1px solid var(--slate-200)", borderRadius: 16, boxShadow: "var(--shadow-card)", padding: "18px 20px", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Where visitors are</div>
              <span style={{ fontSize: 12, color: "var(--slate-400)" }}>Top {vm.geoCount} countries</span>
            </div>
            <svg viewBox="0 0 650 247" width="100%" style={{ display: "block", margin: "2px 0 10px" }}>
              {DOTS.map((wd, i) => (
                <circle key={i} cx={wd.x} cy={wd.y} r="2.2" fill="var(--bsp-blue)" opacity="0.22" />
              ))}
              {vm.world.hotspots.map((h, i) => (
                <circle key={`hp${i}`} cx={h.x} cy={h.y} r="11" fill="var(--bsp-blue)" opacity="0.16" style={{ transformOrigin: h.origin, animation: "hs-pulse 3s ease-in-out infinite" }} />
              ))}
              {vm.world.hotspots.map((h, i) => (
                <circle key={`hc${i}`} cx={h.x} cy={h.y} r="4.5" fill="var(--bsp-blue)" />
              ))}
            </svg>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "9px 18px", marginTop: "auto" }}>
              {vm.geo.map((gc, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--bsp-blue)", background: "var(--bsp-blue-100)", borderRadius: 5, padding: "2px 5px", minWidth: 26, textAlign: "center" }}>{gc.code}</span>
                  <span style={{ fontSize: 12.5, color: "var(--slate-600)", flex: 1 }}>{gc.name}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 700 }}>{gc.value}%</span>
                </div>
              ))}
              {vm.geo.length === 0 && <span style={{ fontSize: 12.5, color: "var(--slate-400)" }}>No data yet.</span>}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="hover-lift" style={{ background: "rgba(255,255,255,0.92)", border: "1px solid var(--slate-200)", borderRadius: 16, boxShadow: "var(--shadow-card)", padding: "18px 20px" }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Top pages</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                {vm.pages.map((p, i) => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--bsp-blue)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.path}</span>
                      <span style={{ fontSize: 12.5, fontWeight: 700, minWidth: 52, textAlign: "right" }}>{p.viewsFmt}</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 999, background: "var(--slate-100)", overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 999, background: "var(--bsp-blue)", width: p.pctW, opacity: 0.85 }} />
                    </div>
                  </div>
                ))}
                {vm.pages.length === 0 && <span style={{ fontSize: 12.5, color: "var(--slate-400)" }}>No data yet.</span>}
              </div>
            </div>
            <div className="hover-lift" style={{ background: "rgba(255,255,255,0.92)", border: "1px solid var(--slate-200)", borderRadius: 16, boxShadow: "var(--shadow-card)", padding: "18px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Build performance</div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: vm.allGood ? "var(--success)" : "var(--warning)",
                    background: vm.allGood ? "rgba(22,163,74,0.12)" : "rgba(245,158,11,0.12)",
                    border: `1px solid ${vm.allGood ? "rgba(22,163,74,0.3)" : "rgba(245,158,11,0.3)"}`,
                    borderRadius: 999,
                    padding: "2px 9px",
                  }}
                >
                  {vm.allGood ? "All good" : "Needs attention"}
                </span>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                {vm.vitals.map((v, i) => (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={{ fontSize: 11, color: "var(--slate-400)", fontWeight: 600, letterSpacing: "0.03em" }}>{v.name}</span>
                    <span style={{ fontWeight: "var(--weight-bold)", fontSize: 19, lineHeight: 1, fontFamily: "var(--font-heading)" }}>
                      {v.value}
                      <span style={{ fontSize: 12, color: "var(--slate-400)", fontWeight: 500 }}> {v.unit}</span>
                    </span>
                    <div style={{ height: 6, borderRadius: 999, background: "var(--slate-100)", overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 999, background: v.good ? "var(--success)" : "var(--warning)", width: v.pctW }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
