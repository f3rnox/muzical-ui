import type { Track } from "@/types/track";

/**
 * Normalize a track before storing it in the persisted library catalog.
 */
export default function normalizeTrackForLibrarySave(track: Track): Track {
  const hasFile = Boolean(track.library);
  if (hasFile) {
    return { ...track, source: track.source ?? "library" };
  }

  if (track.source === "musicbrainz" || track.id.startsWith("musicbrainz:")) {
    return {
      ...track,
      source: "musicbrainz",
      library: undefined,
    };
  }

  if (track.youtubeQuery?.trim()) {
    return {
      ...track,
      source: track.source ?? "musicbrainz",
      library: undefined,
    };
  }

  return { ...track, library: undefined };
}
