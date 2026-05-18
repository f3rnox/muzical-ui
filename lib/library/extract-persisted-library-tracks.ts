import isPersistedLibraryTrack from "@/lib/library/is-persisted-library-track";
import type { Track } from "@/types/track";

/**
 * Return saved MusicBrainz/YouTube tracks from a library track list.
 */
export default function extractPersistedLibraryTracks(
  tracks: readonly Track[],
): Track[] {
  return tracks.filter(isPersistedLibraryTrack);
}
