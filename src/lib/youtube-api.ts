// Thin server-only client for the YouTube Data API v3.
// Auth: API key from process.env.YOUTUBE_API_KEY (see .env.local.example).

const API_BASE = "https://www.googleapis.com/youtube/v3";

export class YoutubeApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function getConfig() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const channelId = process.env.YOUTUBE_CHANNEL_ID;
  const handle = process.env.YOUTUBE_HANDLE;
  if (!apiKey) throw new YoutubeApiError("YOUTUBE_API_KEY is not set", 401);
  if (!channelId && !handle) throw new YoutubeApiError("Set either YOUTUBE_CHANNEL_ID or YOUTUBE_HANDLE", 401);
  return { apiKey, channelId, handle };
}

async function yt<T>(path: string, params: Record<string, string | undefined>): Promise<T> {
  const { apiKey } = getConfig();
  const url = new URL(API_BASE + path);
  url.searchParams.set("key", apiKey);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new YoutubeApiError(`YouTube API ${path} failed: ${res.status} ${body}`, res.status);
  }
  return res.json() as Promise<T>;
}

export type ChannelSummary = {
  id: string;
  title: string;
  thumbnail: string | null;
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
  uploadsPlaylistId: string;
};

type ChannelsResponse = {
  items: {
    id: string;
    snippet: { title: string; thumbnails?: { default?: { url?: string }; medium?: { url?: string } } };
    statistics: { subscriberCount?: string; viewCount?: string; videoCount?: string; hiddenSubscriberCount?: boolean };
    contentDetails: { relatedPlaylists: { uploads: string } };
  }[];
};

export async function getChannelSummary(): Promise<ChannelSummary> {
  const { channelId, handle } = getConfig();
  const data = await yt<ChannelsResponse>("/channels", {
    part: "snippet,statistics,contentDetails",
    id: channelId,
    forHandle: channelId ? undefined : handle?.replace(/^@/, ""),
  });
  const item = data.items?.[0];
  if (!item) throw new YoutubeApiError("Channel not found", 404);
  return {
    id: item.id,
    title: item.snippet.title,
    thumbnail: item.snippet.thumbnails?.medium?.url ?? item.snippet.thumbnails?.default?.url ?? null,
    subscriberCount: Number(item.statistics.subscriberCount ?? 0),
    viewCount: Number(item.statistics.viewCount ?? 0),
    videoCount: Number(item.statistics.videoCount ?? 0),
    uploadsPlaylistId: item.contentDetails.relatedPlaylists.uploads,
  };
}

type PlaylistItemsResponse = {
  items: { contentDetails: { videoId: string; videoPublishedAt?: string } }[];
};

export async function getRecentVideoIds(uploadsPlaylistId: string, max = 10): Promise<string[]> {
  const data = await yt<PlaylistItemsResponse>("/playlistItems", {
    part: "contentDetails",
    playlistId: uploadsPlaylistId,
    maxResults: String(max),
  });
  return data.items.map((i) => i.contentDetails.videoId);
}

export type VideoStat = {
  id: string;
  title: string;
  publishedAt: string;
  thumbnail: string | null;
  viewCount: number;
  likeCount: number;
  commentCount: number;
};

type VideosResponse = {
  items: {
    id: string;
    snippet: { title: string; publishedAt: string; thumbnails?: { default?: { url?: string }; medium?: { url?: string } } };
    statistics: { viewCount?: string; likeCount?: string; commentCount?: string };
  }[];
};

export async function getVideoStats(videoIds: string[]): Promise<VideoStat[]> {
  if (!videoIds.length) return [];
  const data = await yt<VideosResponse>("/videos", {
    part: "snippet,statistics",
    id: videoIds.join(","),
  });
  return data.items.map((i) => ({
    id: i.id,
    title: i.snippet.title,
    publishedAt: i.snippet.publishedAt,
    thumbnail: i.snippet.thumbnails?.medium?.url ?? i.snippet.thumbnails?.default?.url ?? null,
    viewCount: Number(i.statistics.viewCount ?? 0),
    likeCount: Number(i.statistics.likeCount ?? 0),
    commentCount: Number(i.statistics.commentCount ?? 0),
  }));
}
