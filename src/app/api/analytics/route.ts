import { NextResponse } from "next/server";
import { getSiteMetas, VercelApiError } from "@/lib/command-center-data";
import { computeSiteView } from "@/lib/analytics-view";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sites = await getSiteMetas();
    if (!sites.length) {
      return NextResponse.json({ sites, initialView: null, error: null });
    }
    const defaultSite = sites.find((s) => s.name === "byte-sized-python") ?? sites[0];
    const initialView = await computeSiteView(sites, defaultSite.id, "30d");
    return NextResponse.json({ sites, initialView, error: null });
  } catch (err) {
    if (err instanceof VercelApiError) {
      const message =
        err.status === 401
          ? "No Vercel API token was found, so we can't pull your projects and analytics yet."
          : `The Vercel API returned an error (${err.status}). Double-check your token's permissions and team ID.`;
      return NextResponse.json({ sites: [], initialView: null, error: message });
    }
    return NextResponse.json({ sites: [], initialView: null, error: "Failed to load data" }, { status: 500 });
  }
}
