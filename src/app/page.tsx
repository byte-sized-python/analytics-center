import { getSiteMetas, VercelApiError } from "@/lib/command-center-data";
import { computeSiteView } from "@/lib/analytics-view";
import { auth0 } from "@/lib/auth0";
import CommandCenter from "@/components/command-center";
import SetupNotice from "@/components/setup-notice";

export const dynamic = "force-dynamic";

async function loadInitial() {
  try {
    const sites = await getSiteMetas();
    if (!sites.length) return { sites, initialView: null, error: null as string | null };
    const defaultSite = sites.find((s) => s.name === "byte-sized-python") ?? sites[0];
    const initialView = await computeSiteView(sites, defaultSite.id, "30d");
    return { sites, initialView, error: null as string | null, defaultSiteId: defaultSite.id };
  } catch (err) {
    if (err instanceof VercelApiError) {
      const message =
        err.status === 401
          ? "No Vercel API token was found, so we can't pull your projects and analytics yet."
          : `The Vercel API returned an error (${err.status}). Double-check your token's permissions and team ID.`;
      return { sites: [], initialView: null, error: message };
    }
    throw err;
  }
}

export default async function Home() {
  // Middleware already enforces auth + the @bytesizedpython.org domain check
  // for every request that reaches this page; this is just for display.
  const session = await auth0.getSession();
  const { sites, initialView, error, defaultSiteId } = await loadInitial();

  if (error) return <SetupNotice message={error} />;
  if (!sites.length || !initialView || !defaultSiteId) {
    return <SetupNotice message="No Vercel projects were found for this token/team. Create a project on Vercel, then reload." />;
  }

  return (
    <CommandCenter
      sites={sites}
      initialSiteId={defaultSiteId}
      initialRange="30d"
      initialView={initialView}
      user={session ? { name: session.user.name ?? session.user.email ?? "Signed in", picture: session.user.picture ?? null } : null}
    />
  );
}
