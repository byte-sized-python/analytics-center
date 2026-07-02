// Thin server-only client for the Vercel REST API.
// Auth: Bearer token from process.env.VERCEL_TOKEN (see .env.local.example).

const API_BASE = "https://api.vercel.com";

export class VercelApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function authHeaders() {
  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    throw new VercelApiError("VERCEL_TOKEN is not set", 401);
  }
  return { Authorization: `Bearer ${token}` };
}

async function vercelFetch<T>(path: string, params: Record<string, string | undefined> = {}): Promise<T> {
  const url = new URL(API_BASE + path);
  const teamId = process.env.VERCEL_TEAM_ID;
  if (teamId) url.searchParams.set("teamId", teamId);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    headers: authHeaders(),
    // Deployment/project data changes constantly; never cache stale reads.
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new VercelApiError(`Vercel API ${path} failed: ${res.status} ${body}`, res.status);
  }
  return res.json() as Promise<T>;
}

export type VercelProject = {
  id: string;
  name: string;
  framework: string | null;
  serverlessFunctionRegion?: string | null;
  link?: { type?: string; org?: string; repo?: string } | null;
  targets?: { production?: { domain?: string; url?: string } } | null;
  latestDeployments?: {
    uid: string;
    url: string;
    createdAt: number;
    readyState: string;
    target?: string | null;
  }[];
};

export type VercelDeployment = {
  uid: string;
  name: string;
  url: string;
  created: number;
  buildingAt?: number;
  ready?: number;
  state?: string;
  readyState?: string;
  target?: string | null;
  regions?: string[];
  meta?: Record<string, string>;
};

export async function listProjects(limit = 8): Promise<VercelProject[]> {
  const data = await vercelFetch<{ projects: VercelProject[] }>("/v9/projects", {
    limit: String(limit),
  });
  return data.projects;
}

export async function listDeployments(projectId: string, sinceMs: number): Promise<VercelDeployment[]> {
  const data = await vercelFetch<{ deployments: VercelDeployment[] }>("/v6/deployments", {
    projectId,
    since: String(sinceMs),
    limit: "100",
  });
  return data.deployments;
}

// ---- Web Analytics Query API ----
// https://vercel.com/docs/analytics/query-api — requires Web Analytics to be
// enabled on the project. Returns 4xx if it isn't.

export type WAAggregateRow = {
  timestamp?: string;
  pageviews?: number;
  visitors?: number;
  count?: number;
  [dimension: string]: string | number | undefined;
};

export type WACountResult = { pageviews: number; visitors: number };

type AggregateParams = {
  projectId: string;
  since: string;
  until: string;
  by?: string;
  filter?: string;
  limit?: number;
};

async function queryVisits<T>(endpoint: "aggregate" | "count", params: AggregateParams): Promise<T> {
  return vercelFetch<{ data: T }>(`/v1/query/web-analytics/visits/${endpoint}`, {
    projectId: params.projectId,
    since: params.since,
    until: params.until,
    by: params.by,
    filter: params.filter,
    limit: params.limit !== undefined ? String(params.limit) : undefined,
  }).then((r) => r.data);
}

export async function queryVisitsAggregate(params: AggregateParams): Promise<WAAggregateRow[]> {
  return queryVisits<WAAggregateRow[]>("aggregate", params);
}

export async function queryVisitsCount(params: Omit<AggregateParams, "by" | "limit">): Promise<WACountResult> {
  return queryVisits<WACountResult>("count", params);
}
