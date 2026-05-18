import parseLastfmTrackGetSimilarResponse from "@/lib/lastfm/parse-lastfm-track-get-similar-response";
import readStoredLastfmApiKey from "@/lib/lastfm/read-stored-lastfm-api-key";
import type { LastfmSimilarTrack } from "@/types/lastfm-similar-track";

export type FetchLastfmTrackGetSimilarParams = {
  artist: string;
  track: string;
  mbid?: string;
  limit?: number;
};

const LASTFM_API_KEY_HEADER = "X-Muzical-Lastfm-Api-Key";

/**
 * Fetch similar tracks via Last.fm `track.getSimilar` (server proxy).
 */
export default async function fetchLastfmTrackGetSimilar(
  params: FetchLastfmTrackGetSimilarParams,
  signal?: AbortSignal,
): Promise<LastfmSimilarTrack[]> {
  const artist = params.artist.trim();
  const track = params.track.trim();
  const mbid = params.mbid?.trim();
  if (!mbid && (!artist || !track)) return [];

  const apiKey = readStoredLastfmApiKey();
  if (!apiKey) {
    throw new Error("Add a Last.fm API key in Settings → Last.fm");
  }

  const url = new URL("/api/lastfm/track-similar", window.location.origin);
  url.searchParams.set("artist", artist);
  url.searchParams.set("track", track);
  if (mbid) url.searchParams.set("mbid", mbid);
  if (params.limit !== undefined)
    url.searchParams.set("limit", String(params.limit));

  const response = await fetch(url, {
    signal,
    headers: { [LASTFM_API_KEY_HEADER]: apiKey },
  });

  const body: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = body as { error?: string };
    console.error("[Last.fm] proxy request failed", {
      status: response.status,
      statusText: response.statusText,
      proxyUrl: url.toString(),
      body,
    });
    throw new Error(
      err.error?.trim() || `Last.fm request failed (${response.status})`,
    );
  }

  const wrapped = body as { tracks?: unknown };
  if (Array.isArray(wrapped.tracks)) {
    return wrapped.tracks as LastfmSimilarTrack[];
  }

  return parseLastfmTrackGetSimilarResponse(body);
}
