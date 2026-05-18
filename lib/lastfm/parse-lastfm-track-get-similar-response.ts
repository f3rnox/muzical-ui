import type { LastfmSimilarTrack } from "@/types/lastfm-similar-track";

type LastfmArtistJson = {
  name?: string;
  "#text"?: string;
};

type LastfmSimilarTrackJson = {
  name?: string;
  artist?: LastfmArtistJson | string;
  mbid?: string;
  match?: string;
  url?: string;
  duration?: string;
};

type LastfmTrackGetSimilarBody = {
  similartracks?: {
    track?: LastfmSimilarTrackJson | LastfmSimilarTrackJson[];
  };
  error?: number;
  message?: string;
};

function artistNameFromJson(artist: LastfmSimilarTrackJson["artist"]): string {
  if (typeof artist === "string") return artist.trim();
  if (!artist || typeof artist !== "object") return "";
  const named = artist.name?.trim() || artist["#text"]?.trim();
  return named ?? "";
}

function parseMatch(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : undefined;
}

function parseDurationSec(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function mapOne(raw: LastfmSimilarTrackJson): LastfmSimilarTrack | null {
  const name = raw.name?.trim();
  const artistName = artistNameFromJson(raw.artist);
  if (!name || !artistName) return null;
  const mbid = raw.mbid?.trim();
  return {
    name,
    artistName,
    mbid: mbid && mbid.length > 0 ? mbid : undefined,
    match: parseMatch(raw.match),
    url: raw.url?.trim() || undefined,
    durationSec: parseDurationSec(raw.duration),
  };
}

/**
 * Parse Last.fm `track.getSimilar` JSON into similar track rows.
 */
export default function parseLastfmTrackGetSimilarResponse(
  body: unknown,
): LastfmSimilarTrack[] {
  const data = body as LastfmTrackGetSimilarBody;
  if (typeof data.error === "number" && data.error > 0) {
    const msg = data.message?.trim();
    throw new Error(msg || `Last.fm error ${data.error}`);
  }
  const raw = data.similartracks?.track;
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  const out: LastfmSimilarTrack[] = [];
  for (const item of list) {
    const mapped = mapOne(item);
    if (mapped) out.push(mapped);
  }
  return out;
}
