import parsePersistedTrack from "@/lib/playback/parse-persisted-track";
import type { Track } from "@/types/track";

/**
 * Parse and validate tracks loaded from the IndexedDB catalog snapshot.
 */
export default function parsePersistedCatalogTracks(
  raw: readonly unknown[],
): Track[] {
  const out: Track[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const track = parsePersistedTrack(item);
    if (!track || seen.has(track.id)) continue;
    seen.add(track.id);
    out.push(track);
  }
  return out;
}
