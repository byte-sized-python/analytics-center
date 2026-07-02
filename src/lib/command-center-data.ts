import { listProjects, VercelApiError } from "./vercel-api";

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
  const projects = await listProjects(maxSites);
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
