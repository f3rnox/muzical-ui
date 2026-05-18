import type { Playlist } from "@/types/playlist";
import type { Track } from "@/types/track";

/**
 * Resolves a playlist's `trackIds` against the library catalog. Missing ids
 * are skipped (preserves order of present tracks).
 */
export default function resolvePlaylistTracks(
  playlist: Playlist,
  libraryTracks: readonly Track[],
): Track[] {
  if (playlist.trackIds.length === 0) return [];
  const byId = new Map<string, Track>();
  for (const t of libraryTracks) {
    byId.set(t.id, t);
  }
  const out: Track[] = [];
  for (const id of playlist.trackIds) {
    const t = byId.get(id);
    if (t) out.push(t);
  }
  return out;
}
