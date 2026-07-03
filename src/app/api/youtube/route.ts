import { NextRequest, NextResponse } from "next/server";
import { computeYoutubeView, type YoutubeRangeKey } from "@/lib/youtube-view";
import { YoutubeApiError } from "@/lib/youtube-api";

export const dynamic = "force-dynamic";

const VALID_RANGES: YoutubeRangeKey[] = ["7d", "28d", "90d"];

export async function GET(req: NextRequest) {
  const rangeParam = req.nextUrl.searchParams.get("range");
  const range = (VALID_RANGES as string[]).includes(rangeParam ?? "") ? (rangeParam as YoutubeRangeKey) : "28d";

  try {
    const vm = await computeYoutubeView(range);
    return NextResponse.json(vm);
  } catch (err) {
    if (err instanceof YoutubeApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
