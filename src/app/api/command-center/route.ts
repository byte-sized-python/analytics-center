import { NextRequest, NextResponse } from "next/server";
import { getSiteMetas } from "@/lib/command-center-data";
import { computeSiteView, type RangeKey } from "@/lib/analytics-view";
import { VercelApiError } from "@/lib/vercel-api";

export const dynamic = "force-dynamic";

const VALID_RANGES: RangeKey[] = ["24h", "7d", "30d", "90d"];

export async function GET(req: NextRequest) {
  const siteId = req.nextUrl.searchParams.get("siteId");
  const rangeParam = req.nextUrl.searchParams.get("range");
  const range = (VALID_RANGES as string[]).includes(rangeParam ?? "") ? (rangeParam as RangeKey) : "24h";

  if (!siteId) {
    return NextResponse.json({ error: "siteId is required" }, { status: 400 });
  }

  try {
    const sites = await getSiteMetas();
    if (!sites.find((s) => s.id === siteId)) {
      return NextResponse.json({ error: "unknown siteId" }, { status: 404 });
    }
    const vm = await computeSiteView(sites, siteId, range);
    return NextResponse.json(vm);
  } catch (err) {
    if (err instanceof VercelApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
