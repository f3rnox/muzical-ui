import isPersistedLibraryTrack from "@/lib/library/is-persisted-library-track";
import type { Track } from "@/types/track";

/**
 * Merge a folder scan with saved MusicBrainz/YouTube library entries (by track id).
 */
export default function mergeScannedTracksWithSavedLibrary(
  scanned: readonly Track[],
  existing: readonly Track[],
): Track[] {
  const merged = new Map<string, Track>();
  for (const track of scanned) {
    merged.set(track.id, track);
  }
  for (const track of existing) {
    if (!isPersistedLibraryTrack(track)) continue;
    if (!merged.has(track.id)) {
      merged.set(track.id, track);
    }
  }
  return [...merged.values()];
}
