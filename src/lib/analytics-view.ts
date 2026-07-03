import type { SiteMeta } from "./command-center-data";
import { listDeployments, queryVisitsAggregate, type WAAggregateRow } from "./vercel-api";
import { donut, fmtK, fmtNum, linePath, spark } from "./chart-math";
import { countryName, countryToPoint } from "./country-map";

export type RangeKey = "24h" | "7d" | "30d" | "90d";

const RANGE_DEF: Record<RangeKey, { label: string; upper: string; ms: number; grain: "hour" | "day" }> = {
  "24h": { label: "vs. prev 24h", upper: "LAST 24 HOURS", ms: 24 * 60 * 60 * 1000, grain: "hour" },
  "7d": { label: "vs. prev 7 days", upper: "LAST 7 DAYS", ms: 7 * 24 * 60 * 60 * 1000, grain: "day" },
  "30d": { label: "vs. prev 30 days", upper: "LAST 30 DAYS", ms: 30 * 24 * 60 * 60 * 1000, grain: "day" },
  "90d": { label: "vs. prev 90 days", upper: "LAST 90 DAYS", ms: 90 * 24 * 60 * 60 * 1000, grain: "day" },
};
export { RANGE_DEF as RANGE_META };

async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch {
    return fallback;
  }
}

function iso(ms: number) {
  return new Date(ms).toISOString();
}

function deltaPct(curr: number, prev: number) {
  if (prev === 0) return curr === 0 ? 0 : 100;
  return ((curr - prev) / prev) * 100;
}

function num(row: WAAggregateRow, key: "pageviews" | "visitors" | "count") {
  return typeof row[key] === "number" ? (row[key] as number) : 0;
}

// visits/count silently truncates since/until to whole UTC calendar days,
// which makes it useless for a rolling 24h (or any sub-day) window — it
// would return "yesterday" instead of "the last 24 hours". visits/aggregate
// respects real timestamps, so totals are computed by summing its rows.
function sumAgg(rows: WAAggregateRow[]) {
  return { pageviews: rows.reduce((a, r) => a + num(r, "pageviews"), 0), visitors: rows.reduce((a, r) => a + num(r, "visitors"), 0) };
}

async function fetchTrend(projectId: string, since: string, until: string, grain: "hour" | "day"): Promise<WAAggregateRow[]> {
  try {
    return await queryVisitsAggregate({ projectId, since, until, by: grain });
  } catch {
    if (grain === "hour") {
      return safe(queryVisitsAggregate({ projectId, since, until, by: "day" }), []);
    }
    return [];
  }
}

function fmtBucketLabel(ts: string | undefined, grain: "hour" | "day") {
  if (!ts) return "";
  const dt = new Date(ts);
  if (Number.isNaN(dt.getTime())) return "";
  if (grain === "hour") return dt.toLocaleTimeString("en-US", { hour: "2-digit", hour12: false }).replace(/:.*$/, "");
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtTooltipLabel(ts: string | undefined, grain: "hour" | "day") {
  if (!ts) return "";
  const dt = new Date(ts);
  if (Number.isNaN(dt.getTime())) return "";
  if (grain === "hour") return dt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", hour12: true });
  return dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function classifyReferrer(hostname: string | undefined): "Direct" | "Search" | "Social" | "Referral" {
  if (!hostname) return "Direct";
  const h = hostname.toLowerCase();
  if (["google.", "bing.", "duckduckgo.", "yahoo.", "baidu.", "yandex."].some((s) => h.includes(s))) return "Search";
  if (["facebook.", "twitter.", "x.com", "t.co", "instagram.", "linkedin.", "reddit.", "tiktok.", "pinterest.", "threads."].some((s) => h.includes(s))) return "Social";
  return "Referral";
}

// "" is a real value (e.g. direct referrer, root route) — only "Others" and
// missing keys should be dropped.
function dropOthers(rows: WAAggregateRow[], key: string) {
  return rows.filter((r) => r[key] !== "Others" && r[key] !== undefined);
}

export async function computeSiteView(sites: SiteMeta[], siteId: string, range: RangeKey) {
  const rm = RANGE_DEF[range];
  const now = Date.now();
  const since = iso(now - rm.ms);
  const until = iso(now);
  const prevSince = iso(now - 2 * rm.ms);
  const prevUntil = since;

  const site = sites.find((s) => s.id === siteId) ?? sites[0];

  const [trendRows, prevTrendRows, countryRows, deviceRows, refRows, refRowsPrev, routeRows, compareRows, deployments] = await Promise.all([
    fetchTrend(site.id, since, until, rm.grain),
    fetchTrend(site.id, prevSince, prevUntil, rm.grain),
    safe(queryVisitsAggregate({ projectId: site.id, since, until, by: "country", limit: 6 }), []),
    safe(queryVisitsAggregate({ projectId: site.id, since, until, by: "deviceType", limit: 5 }), []),
    safe(queryVisitsAggregate({ projectId: site.id, since, until, by: "referrerHostname", limit: 20 }), []),
    safe(queryVisitsAggregate({ projectId: site.id, since: prevSince, until: prevUntil, by: "referrerHostname", limit: 20 }), []),
    safe(queryVisitsAggregate({ projectId: site.id, since, until, by: "route", limit: 5 }), []),
    Promise.all(sites.map((s) => fetchTrend(s.id, since, until, rm.grain))),
    safe(listDeployments(site.id, now - rm.ms), []),
  ]);

  const countCurr = sumAgg(trendRows);
  const countPrev = sumAgg(prevTrendRows);
  const compareCounts = compareRows.map(sumAgg);

  // ---- trend (real pageviews + visitors over time) ----
  const pv = trendRows.map((r) => num(r, "pageviews"));
  const vis = trendRows.map((r) => num(r, "visitors"));
  const maxVal = Math.max(1, ...pv, ...vis) * 1.08;
  const visPath = linePath(vis, maxVal, 1000, 240, 12, 10);
  const pvPath = linePath(pv, maxVal, 1000, 240, 12, 10);
  const gridLabels = [maxVal, maxVal * 0.75, maxVal * 0.5, maxVal * 0.25, 0].map((v) => fmtK(v));
  const grid = gridLabels.map((label, i) => ({ label, y: +(12 + (i / 4) * (240 - 22)).toFixed(1) }));
  const step = Math.max(1, Math.floor(trendRows.length / 6));
  const xlabels: string[] = [];
  for (let i = 0; i < trendRows.length; i += step) xlabels.push(fmtBucketLabel(trendRows[i]?.timestamp, rm.grain));
  if (trendRows.length) xlabels.push("Now");
  const rows = trendRows.map((r) => {
    const label = fmtTooltipLabel(r.timestamp, rm.grain);
    const pageviews = num(r, "pageviews");
    const visitors = num(r, "visitors");
    return {
      label,
      pageviews,
      visitors,
      values: [
        { key: "visitors", text: `${fmtNum(visitors)} visitors`, color: "var(--bsp-blue)" },
        { key: "pageviews", text: `${fmtNum(pageviews)} page views`, color: "var(--bsp-yellow-2)" },
      ],
    };
  });
  const trend = {
    visLine: visPath.line,
    visArea: visPath.area,
    pvLine: pvPath.line,
    pvArea: pvPath.area,
    visPoints: visPath.points,
    pvPoints: pvPath.points,
    grid,
    xlabels,
    rows,
  };

  // ---- KPIs ----
  const pagesPerVisit = countCurr.visitors ? countCurr.pageviews / countCurr.visitors : 0;
  const pagesPerVisitPrev = countPrev.visitors ? countPrev.pageviews / countPrev.visitors : 0;

  const directShare = (rows: WAAggregateRow[]) => {
    const clean = dropOthers(rows, "referrerHostname");
    const total = clean.reduce((a, r) => a + num(r, "visitors"), 0);
    const direct = clean.filter((r) => classifyReferrer(r.referrerHostname as string | undefined) === "Direct").reduce((a, r) => a + num(r, "visitors"), 0);
    return total ? (direct / total) * 100 : 0;
  };
  const directCurr = directShare(refRows);
  const directPrev = directShare(refRowsPrev);

  const mk = (label: string, value: string, delta: number, unit: "%" | "pts", good: boolean, sparkVals: number[]) => {
    const sp = spark(sparkVals.length > 1 ? sparkVals : [0, 0]);
    const arrow = delta >= 0 ? "▲" : "▼";
    return {
      label,
      value,
      deltaText: `${arrow} ${Math.abs(Math.round(delta * 10) / 10)}${unit === "pts" ? " pts" : "%"}`,
      deltaStyle: {
        display: "inline-flex" as const,
        alignItems: "center" as const,
        gap: 6,
        fontSize: 12.5,
        fontWeight: 700,
        color: good ? "var(--success)" : "var(--danger)",
      },
      sparkLine: sp.line,
      sparkArea: sp.area,
    };
  };

  const kpis = [
    mk("Unique visitors", fmtNum(countCurr.visitors), deltaPct(countCurr.visitors, countPrev.visitors), "%", countCurr.visitors >= countPrev.visitors, vis),
    mk("Page views", fmtNum(countCurr.pageviews), deltaPct(countCurr.pageviews, countPrev.pageviews), "%", countCurr.pageviews >= countPrev.pageviews, pv),
    mk("Pages / visit", pagesPerVisit.toFixed(2), deltaPct(pagesPerVisit, pagesPerVisitPrev), "%", pagesPerVisit >= pagesPerVisitPrev, trendRows.map((r) => (num(r, "visitors") ? num(r, "pageviews") / num(r, "visitors") : 0))),
    mk("Direct traffic", `${directCurr.toFixed(0)}%`, directCurr - directPrev, "pts", true, [directPrev, directCurr]),
  ];

  // ---- traffic sources donut ----
  const refClean = dropOthers(refRows, "referrerHostname");
  const sourceTotals = { Direct: 0, Search: 0, Social: 0, Referral: 0 };
  for (const r of refClean) sourceTotals[classifyReferrer(r.referrerHostname as string | undefined)] += num(r, "visitors");
  const hasSourceData = Object.values(sourceTotals).some((v) => v > 0);
  const sources = donut(
    hasSourceData
      ? (Object.entries(sourceTotals).filter(([, v]) => v > 0) as [string, number][])
      : [["No data", 1]]
  );

  // ---- devices ----
  const deviceClean = dropOthers(deviceRows, "deviceType");
  const deviceTotal = deviceClean.reduce((a, r) => a + num(r, "visitors"), 0) || 1;
  const deviceColors = ["#3776AB", "#FED33B", "#94A3B8", "#F75D5D"];
  const devices = deviceClean
    .sort((a, b) => num(b, "visitors") - num(a, "visitors"))
    .map((r, i) => {
      const value = Math.round((num(r, "visitors") / deviceTotal) * 100);
      const label = String(r.deviceType ?? "Unknown");
      return { label: label.charAt(0).toUpperCase() + label.slice(1), value, color: deviceColors[i % deviceColors.length], pctW: `${value}%` };
    });

  // ---- geo ----
  const countryClean = dropOthers(countryRows, "country").filter((r) => r.country !== "");
  const countryTotal = countryClean.reduce((a, r) => a + num(r, "visitors"), 0) || 1;
  const geo = countryClean
    .sort((a, b) => num(b, "visitors") - num(a, "visitors"))
    .map((r) => {
      const code = String(r.country);
      return { code, name: countryName(code), value: Math.round((num(r, "visitors") / countryTotal) * 100) };
    });
  const hotspots = geo
    .map((g) => {
      const pt = countryToPoint(g.code);
      return pt ? { x: pt.x, y: pt.y, origin: `${pt.x}px ${pt.y}px` } : null;
    })
    .filter((v): v is { x: number; y: number; origin: string } => v !== null);

  // ---- top pages (routes) ----
  const routeClean = dropOthers(routeRows, "route");
  const maxRoutePv = Math.max(1, ...routeClean.map((r) => num(r, "pageviews")));
  const pages = routeClean
    .sort((a, b) => num(b, "pageviews") - num(a, "pageviews"))
    .map((r) => ({
      path: r.route ? String(r.route) : "/",
      viewsFmt: fmtNum(num(r, "pageviews")),
      pctW: `${Math.round((num(r, "pageviews") / maxRoutePv) * 100)}%`,
    }));

  // ---- compare across sites ----
  const cmax = Math.max(1, ...compareCounts.map((c) => c.visitors));
  const compare = sites.map((s, i) => {
    const active = s.id === site.id;
    return {
      name: s.name,
      valueFmt: fmtNum(compareCounts[i].visitors),
      pctW: `${Math.round((compareCounts[i].visitors / cmax) * 100)}%`,
      barColor: active ? s.color : "var(--slate-300)",
      labelColor: active ? "var(--bsp-ink)" : "var(--slate-500)",
      weight: active ? "700" : "500",
    };
  });

  // ---- build performance (from Deployments API — Web Analytics has no CWV query endpoint) ----
  const ready = deployments.filter((d) => (d.readyState ?? d.state) === "READY" && d.ready);
  const avgBuild = ready.length ? ready.reduce((a, d) => a + (d.ready! - d.created) / 1000, 0) / ready.length : 0;
  const successRate = deployments.length ? (ready.length / deployments.length) * 100 : 0;
  const queueTimes = deployments.filter((d) => d.buildingAt).map((d) => (d.buildingAt! - d.created) / 1000);
  const avgQueue = queueTimes.length ? queueTimes.reduce((a, b) => a + b, 0) / queueTimes.length : 0;
  const vitals = [
    { name: "AVG BUILD", value: avgBuild.toFixed(1), unit: "s", pctW: `${Math.min(100, Math.round((avgBuild / 60) * 100))}%`, good: avgBuild <= 60 },
    { name: "SUCCESS", value: successRate.toFixed(0), unit: "%", pctW: `${Math.min(100, Math.round(successRate))}%`, good: successRate >= 95 },
    { name: "AVG QUEUE", value: avgQueue.toFixed(1), unit: "s", pctW: `${Math.min(100, Math.round((avgQueue / 10) * 100))}%`, good: avgQueue <= 10 },
  ];
  const allGood = vitals.every((v) => v.good);

  return {
    fetchedAt: now,
    sites: sites.map((s, i) => ({
      id: s.id,
      name: s.name,
      initials: s.initials,
      visitorsFmt: fmtNum(compareCounts[i].visitors),
      tileStyle: {
        width: 28,
        height: 28,
        borderRadius: 8,
        display: "flex" as const,
        alignItems: "center" as const,
        justifyContent: "center" as const,
        fontWeight: 700,
        fontSize: 12,
        flexShrink: 0,
        background: s.color,
        color: s.textOn,
      },
      active: s.id === site.id,
    })),
    range,
    rangeLabel: rm.label,
    rangeUpper: rm.upper,
    site: {
      name: site.name,
      domain: site.domain,
      initials: site.initials,
      color: site.color,
      textOn: site.textOn,
      pageviewsFmt: fmtK(countCurr.pageviews),
      latestDeploymentState: site.latestDeploymentState,
    },
    kpis,
    trend,
    sources,
    devices,
    pages,
    geo,
    geoCount: geo.length,
    compare,
    vitals,
    allGood,
    world: { hotspots },
  };
}

export type CommandCenterViewModel = Awaited<ReturnType<typeof computeSiteView>>;
