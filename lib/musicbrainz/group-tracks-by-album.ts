import {
  albumCompositeKey,
  artistDisplayName,
} from "@/lib/library/favorite-keys";
import type { Track } from "@/types/track";

/**
 * Group tracks by album title and artist (composite key).
 */
export function groupTracksByAlbum(
  tracks: readonly Track[],
): Map<string, Track[]> {
  const m = new Map<string, Track[]>();
  for (const t of tracks) {
    const key = albumCompositeKey(t.album, artistDisplayName(t.artist));
    const arr = m.get(key) ?? [];
    arr.push(t);
    m.set(key, arr);
  }
  for (const arr of m.values()) {
    arr.sort((a, b) =>
      a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
    );
  }
  return m;
}
