import performLastfmTrackGetSimilarRequest from "@/lib/lastfm/perform-lastfm-track-get-similar-request";
import normalizeLastfmTrackQuery from "@/lib/lastfm/normalize-lastfm-track-query";
import type { LastfmSimilarTrack } from "@/types/lastfm-similar-track";

export type FetchLastfmTrackGetSimilarRemoteParams = {
  apiKey: string;
  artist: string;
  track: string;
  mbid?: string;
  limit?: number;
};

/**
 * Last.fm `track.getSimilar` with fallbacks when mbid or raw tags are not found.
 */
export default async function fetchLastfmTrackGetSimilarRemote(
  params: FetchLastfmTrackGetSimilarRemoteParams,
): Promise<LastfmSimilarTrack[]> {
  const limit = params.limit ?? 20;
  const artist = params.artist.trim();
  const track = params.track.trim();
  const mbid = params.mbid?.trim();
  const normalized = normalizeLastfmTrackQuery(artist, track);

  const attempts: Array<{
    artist?: string;
    track?: string;
    mbid?: string;
    label: string;
  }> = [];

  if (mbid) {
    attempts.push({ mbid, label: "mbid" });
  }
  if (normalized.artist && normalized.track) {
    attempts.push({
      artist: normalized.artist,
      track: normalized.track,
      label: "normalized",
    });
  }
  if (artist && track) {
    const differs = normalized.artist !== artist || normalized.track !== track;
    if (differs || !mbid) {
      attempts.push({ artist, track, label: "raw" });
    }
  }

  const seen = new Set<string>();
  const uniqueAttempts = attempts.filter((a) => {
    const key = a.mbid ? `mbid:${a.mbid}` : `${a.artist}\u0000${a.track}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  let lastMessage = "Track not found";

  for (let i = 0; i < uniqueAttempts.length; i += 1) {
    const attempt = uniqueAttempts[i];
    const result = await performLastfmTrackGetSimilarRequest({
      apiKey: params.apiKey,
      artist: attempt.artist,
      track: attempt.track,
      mbid: attempt.mbid,
      limit,
    });
    if (result.ok) return result.tracks;
    lastMessage = result.message;
    if (!result.notFound) break;
    const next = uniqueAttempts[i + 1];
    if (next) {
      console.warn("[Last.fm] track.getSimilar not found, retrying", {
        failed: attempt.label,
        next: next.label,
      });
    }
  }

  throw new Error(lastMessage);
}
