import { listProjects, VercelApiError, type VercelProject } from "./vercel-api";

export type SiteMeta = {
  id: string;
  name: string;
  domain: string;
  initials: string;
  color: string;
  textOn: string;
  latestDeploymentState: string | null;
};

const PALETTE: { color: string; textOn: string }[] = [
  { color: "#3776AB", textOn: "#fff" },
  { color: "#FED33B", textOn: "#1E293B" },
  { color: "#2563EB", textOn: "#fff" },
  { color: "#64748B", textOn: "#fff" },
  { color: "#F75D5D", textOn: "#fff" },
  { color: "#0F172A", textOn: "#fff" },
];

function initialsFor(name: string) {
  const words = name.replace(/[-_]/g, " ").split(" ").filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export async function getSiteMetas(maxSites = 4): Promise<SiteMeta[]> {
  // Vercel's GET /v9/projects defaults to most-recently-active first, so a
  // plain limit=maxSites fetch silently drops older projects whenever
  // *anything* (including this dashboard's own deploys) gets more active.
  // Fetch a wider page and then apply stable selection below instead.
  const pageSize = Math.max(maxSites, 20);
  let projects = await listProjects(pageSize);

  // Never list this dashboard's own Vercel project as a "site" — Vercel
  // injects VERCEL_PROJECT_ID automatically at build/runtime when deployed.
  const selfProjectId = process.env.VERCEL_PROJECT_ID;
  if (selfProjectId) {
    projects = projects.filter((p) => p.id !== selfProjectId);
  }

  // Optional explicit allowlist/order, e.g. TRACKED_PROJECT_NAMES=koda,koda-live,koda-studio,byte-sized-python
  // Set this to make the site list immune to deploy-recency reshuffling entirely.
  const tracked = process.env.TRACKED_PROJECT_NAMES?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (tracked?.length) {
    const byName = new Map(projects.map((p) => [p.name, p]));
    projects = tracked.map((name) => byName.get(name)).filter((p): p is VercelProject => Boolean(p));
  }

  projects = projects.slice(0, maxSites);

  return projects.map((project, i) => {
    const palette = PALETTE[i % PALETTE.length];
    const domain = project.targets?.production?.domain ?? project.latestDeployments?.[0]?.url ?? `${project.name}.vercel.app`;
    return {
      id: project.id,
      name: project.name,
      domain,
      initials: initialsFor(project.name),
      color: palette.color,
      textOn: palette.textOn,
      latestDeploymentState: project.latestDeployments?.[0]?.readyState ?? null,
    };
  });
}

export { VercelApiError };
