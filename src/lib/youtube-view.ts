import { getChannelSummary, getRecentVideoIds, getVideoStats } from "./youtube-api";
import { getDailyReport } from "./youtube-analytics-api";
import { isGoogleOAuthConfigured, GoogleOAuthError } from "./google-oauth";
import { fmtK, fmtNum, fmtDur, linePath, spark } from "./chart-math";

export type YoutubeRangeKey = "7d" | "28d" | "90d";

const RANGE_DEF: Record<YoutubeRangeKey, { label: string; days: number }> = {
  "7d": { label: "vs. prev 7 days", days: 7 },
  "28d": { label: "vs. prev 28 days", days: 28 },
  "90d": { label: "vs. prev 90 days", days: 90 },
};

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

function deltaPct(curr: number, prev: number) {
  if (prev === 0) return curr === 0 ? 0 : 100;
  return ((curr - prev) / prev) * 100;
}

async function safeReport(startDate: string, endDate: string) {
  try {
    return await getDailyReport(startDate, endDate);
  } catch {
    return [];
  }
}

export async function computeYoutubeView(range: YoutubeRangeKey = "28d") {
  const channel = await getChannelSummary();
  const recentIds = await getRecentVideoIds(channel.uploadsPlaylistId, 10);
  const videos = await getVideoStats(recentIds);
  videos.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  const avgViews = videos.length ? videos.reduce((a, v) => a + v.viewCount, 0) / videos.length : 0;
  const maxViews = Math.max(1, ...videos.map((v) => v.viewCount));

  const snapshotKpis = [
    { label: "Subscribers", value: fmtK(channel.subscriberCount) },
    { label: "Total views", value: fmtK(channel.viewCount) },
    { label: "Videos", value: fmtNum(channel.videoCount) },
    { label: "Avg views (last 10)", value: fmtK(avgViews) },
  ];

  const videoList = videos.map((v) => ({
    id: v.id,
    title: v.title,
    publishedAt: v.publishedAt,
    thumbnail: v.thumbnail,
    viewsFmt: fmtNum(v.viewCount),
    likesFmt: fmtNum(v.likeCount),
    commentsFmt: fmtNum(v.commentCount),
    pctW: `${Math.round((v.viewCount / maxViews) * 100)}%`,
    url: `https://www.youtube.com/watch?v=${v.id}`,
  }));

  const base = {
    fetchedAt: Date.now(),
    channel,
    range,
    rangeLabel: RANGE_DEF[range].label,
    snapshotKpis,
    videos: videoList,
  };

  if (!isGoogleOAuthConfigured()) {
    return { ...base, analyticsAvailable: false as const, analyticsError: null as string | null };
  }

  const days = RANGE_DEF[range].days;
  const now = new Date();
  const end = new Date(now);
  end.setUTCDate(end.getUTCDate() - 1); // YouTube Analytics data typically lags ~1-2 days
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  const prevEnd = new Date(start);
  prevEnd.setUTCDate(prevEnd.getUTCDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setUTCDate(prevStart.getUTCDate() - (days - 1));

  let rows;
  let prevRows;
  try {
    [rows, prevRows] = await Promise.all([
      getDailyReport(ymd(start), ymd(end)),
      safeReport(ymd(prevStart), ymd(prevEnd)),
    ]);
  } catch (err) {
    const message = err instanceof GoogleOAuthError ? err.message : "Failed to load YouTube Analytics data.";
    return { ...base, analyticsAvailable: false as const, analyticsError: message };
  }

  const sum = (arr: typeof rows, key: keyof (typeof rows)[number]) => arr.reduce((a, r) => a + (Number(r[key]) || 0), 0);

  const currViews = sum(rows, "views");
  const prevViews = sum(prevRows, "views");
  const currMinutes = sum(rows, "estimatedMinutesWatched");
  const prevMinutes = sum(prevRows, "estimatedMinutesWatched");
  const currGained = sum(rows, "subscribersGained");
  const currLost = sum(rows, "subscribersLost");
  const prevGained = sum(prevRows, "subscribersGained");
  const prevLost = sum(prevRows, "subscribersLost");
  const currNetSubs = currGained - currLost;
  const prevNetSubs = prevGained - prevLost;
  const currAvgDur = currViews ? (currMinutes * 60) / currViews : 0;
  const prevAvgDur = prevViews ? (prevMinutes * 60) / prevViews : 0;

  const viewsSeries = rows.map((r) => r.views);
  const minutesSeries = rows.map((r) => r.estimatedMinutesWatched);
  const maxVal = Math.max(1, ...viewsSeries) * 1.08;
  const viewsPath = linePath(viewsSeries, maxVal, 1000, 220, 12, 10);
  const maxMinutes = Math.max(1, ...minutesSeries) * 1.08;
  const minutesPath = linePath(minutesSeries, maxMinutes, 1000, 220, 12, 10);

  const gridLabels = [maxVal, maxVal * 0.75, maxVal * 0.5, maxVal * 0.25, 0].map((v) => fmtK(v));
  const grid = gridLabels.map((label, i) => ({ label, y: +(12 + (i / 4) * (220 - 22)).toFixed(1) }));
  const step = Math.max(1, Math.floor(rows.length / 6));
  const xlabels: string[] = [];
  for (let i = 0; i < rows.length; i += step) {
    xlabels.push(new Date(rows[i].date).toLocaleDateString("en-US", { month: "short", day: "numeric" }));
  }

  const mk = (label: string, value: string, delta: number, good: boolean, sparkVals: number[]) => {
    const sp = spark(sparkVals.length > 1 ? sparkVals : [0, 0]);
    const arrow = delta >= 0 ? "▲" : "▼";
    return {
      label,
      value,
      deltaText: `${arrow} ${Math.abs(Math.round(delta * 10) / 10)}%`,
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

  const analyticsKpis = [
    mk("Views", fmtNum(currViews), deltaPct(currViews, prevViews), currViews >= prevViews, viewsSeries),
    mk("Watch time", `${fmtNum(Math.round(currMinutes / 60))}h`, deltaPct(currMinutes, prevMinutes), currMinutes >= prevMinutes, minutesSeries),
    mk("Avg view duration", fmtDur(currAvgDur), deltaPct(currAvgDur, prevAvgDur), currAvgDur >= prevAvgDur, rows.map((r) => r.averageViewDuration)),
    mk("Net subscribers", `${currNetSubs >= 0 ? "+" : ""}${fmtNum(currNetSubs)}`, deltaPct(currNetSubs, prevNetSubs), currNetSubs >= prevNetSubs, rows.map((r) => r.subscribersGained - r.subscribersLost)),
  ];

  const tooltipRows = rows.map((r) => ({
    label: new Date(r.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
    values: [
      { key: "views", text: `${fmtNum(r.views)} views`, color: "var(--bsp-coral)" },
      { key: "minutes", text: `${fmtNum(Math.round(r.estimatedMinutesWatched))} min watched`, color: "var(--bsp-blue)" },
    ],
  }));

  return {
    ...base,
    analyticsAvailable: true as const,
    analyticsError: null as string | null,
    analyticsKpis,
    trend: {
      viewsLine: viewsPath.line,
      viewsArea: viewsPath.area,
      minutesLine: minutesPath.line,
      minutesArea: minutesPath.area,
      viewsPoints: viewsPath.points,
      minutesPoints: minutesPath.points,
      grid,
      xlabels,
      rows: tooltipRows,
    },
  };
}

export type YoutubeViewModel = Awaited<ReturnType<typeof computeYoutubeView>>;
