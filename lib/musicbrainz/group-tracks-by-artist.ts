import { artistDisplayName } from "@/lib/library/favorite-keys";
import type { Track } from "@/types/track";

/**
 * Group MusicBrainz (or other) tracks by display artist name.
 */
export function groupTracksByArtist(
  tracks: readonly Track[],
): Map<string, Track[]> {
  const m = new Map<string, Track[]>();
  for (const t of tracks) {
    const a = artistDisplayName(t.artist);
    const arr = m.get(a) ?? [];
    arr.push(t);
    m.set(a, arr);
  }
  for (const arr of m.values()) {
    arr.sort((a, b) =>
      a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
    );
  }
  return m;
}
