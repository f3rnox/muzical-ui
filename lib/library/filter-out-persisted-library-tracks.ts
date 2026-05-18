import isPersistedLibraryTrack from "@/lib/library/is-persisted-library-track";
import type { Track } from "@/types/track";

/**
 * Returns only local-file tracks (excludes saved MusicBrainz/YouTube entries).
 */
export default function filterOutPersistedLibraryTracks(
  tracks: readonly Track[],
): Track[] {
  return tracks.filter((track) => !isPersistedLibraryTrack(track));
}
