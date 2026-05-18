import { NextRequest, NextResponse } from "next/server";
import fetchLastfmTrackGetSimilarRemote from "@/lib/lastfm/fetch-lastfm-track-get-similar-remote";

const LASTFM_API_KEY_HEADER = "X-Muzical-Lastfm-Api-Key";

/**
 * Proxy Last.fm `track.getSimilar` (avoids browser CORS limits).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const apiKey =
    request.headers.get(LASTFM_API_KEY_HEADER)?.trim() ||
    request.nextUrl.searchParams.get("api_key")?.trim() ||
    "";
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing Last.fm API key" },
      { status: 400 },
    );
  }

  const artist = request.nextUrl.searchParams.get("artist")?.trim() ?? "";
  const track = request.nextUrl.searchParams.get("track")?.trim() ?? "";
  const mbid = request.nextUrl.searchParams.get("mbid")?.trim() ?? "";
  if (!mbid && (!artist || !track)) {
    return NextResponse.json(
      { error: "artist and track are required" },
      { status: 400 },
    );
  }

  const limitRaw = request.nextUrl.searchParams.get("limit");
  const limit = limitRaw ? Number.parseInt(limitRaw, 10) : 20;
  const safeLimit = Number.isFinite(limit)
    ? Math.min(Math.max(limit, 1), 50)
    : 20;

  try {
    const tracks = await fetchLastfmTrackGetSimilarRemote({
      apiKey,
      artist,
      track,
      mbid: mbid || undefined,
      limit: safeLimit,
    });
    return NextResponse.json({ tracks });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Last.fm request failed";
    const status = /not found/i.test(message) ? 404 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
