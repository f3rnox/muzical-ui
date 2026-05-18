import { NextRequest, NextResponse } from "next/server";
import scrapeYoutubeSearchVideos from "@/lib/youtube/scrape-youtube-search-videos";

/**
 * Server fallback: search YouTube without a client Data API key.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q) {
    return NextResponse.json({ videos: [] }, { status: 400 });
  }

  const maxRaw = request.nextUrl.searchParams.get("maxResults");
  const maxResults = maxRaw ? Number.parseInt(maxRaw, 10) : 20;

  try {
    const videos = await scrapeYoutubeSearchVideos(
      q,
      Number.isFinite(maxResults) ? maxResults : 20,
    );
    return NextResponse.json({ videos });
  } catch {
    return NextResponse.json({ videos: [] }, { status: 502 });
  }
}
