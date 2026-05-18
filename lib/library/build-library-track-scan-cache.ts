import readTrackLibraryFingerprint from "@/lib/library/read-track-library-fingerprint";
import type { Track } from "@/types/track";

/**
 * Build a map of library track id → cached row for unchanged-file skipping.
 */
export default function buildLibraryTrackScanCache(
  existing: readonly Track[],
): Map<string, Track> {
  const cache = new Map<string, Track>();
  for (const track of existing) {
    if (!track.library) continue;
    if (!readTrackLibraryFingerprint(track)) continue;
    cache.set(track.id, track);
  }
  return cache;
}
