import { NextRequest, NextResponse } from "next/server";
import scrapeYoutubeVideoId from "@/lib/youtube/scrape-youtube-video-id";

/**
 * Server fallback: resolve a YouTube video id for a search query without a client API key.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q) {
    return NextResponse.json({ videoId: null }, { status: 400 });
  }

  try {
    const videoId = await scrapeYoutubeVideoId(q);
    return NextResponse.json({ videoId });
  } catch {
    return NextResponse.json({ videoId: null }, { status: 502 });
  }
}
