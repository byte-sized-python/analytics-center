import { getAccessToken, GoogleOAuthError } from "./google-oauth";

const API_BASE = "https://youtubeanalytics.googleapis.com/v2";

export type AnalyticsRow = {
  date: string;
  views: number;
  estimatedMinutesWatched: number;
  averageViewDuration: number;
  subscribersGained: number;
  subscribersLost: number;
};

type ReportResponse = {
  columnHeaders: { name: string }[];
  rows?: (string | number)[][];
};

export async function getDailyReport(startDate: string, endDate: string): Promise<AnalyticsRow[]> {
  const accessToken = await getAccessToken();
  const url = new URL(`${API_BASE}/reports`);
  url.searchParams.set("ids", "channel==MINE");
  url.searchParams.set("startDate", startDate);
  url.searchParams.set("endDate", endDate);
  url.searchParams.set("metrics", "views,estimatedMinutesWatched,averageViewDuration,subscribersGained,subscribersLost");
  url.searchParams.set("dimensions", "day");
  url.searchParams.set("sort", "day");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new GoogleOAuthError(`YouTube Analytics API failed: ${res.status} ${body}`, res.status);
  }
  const data = (await res.json()) as ReportResponse;
  const cols = data.columnHeaders.map((c) => c.name);
  const idx = (name: string) => cols.indexOf(name);

  return (data.rows ?? []).map((row) => ({
    date: String(row[idx("day")]),
    views: Number(row[idx("views")] ?? 0),
    estimatedMinutesWatched: Number(row[idx("estimatedMinutesWatched")] ?? 0),
    averageViewDuration: Number(row[idx("averageViewDuration")] ?? 0),
    subscribersGained: Number(row[idx("subscribersGained")] ?? 0),
    subscribersLost: Number(row[idx("subscribersLost")] ?? 0),
  }));
}
