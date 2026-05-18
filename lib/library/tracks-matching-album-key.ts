import { albumCompositeKey } from "@/lib/library/favorite-keys";
import type { Track } from "@/types/track";

/**
 * Return catalog tracks that belong to an album composite key.
 */
export default function tracksMatchingAlbumKey(
  tracks: readonly Track[],
  albumKey: string,
): Track[] {
  return tracks.filter(
    (t) => albumCompositeKey(t.album, t.artist) === albumKey,
  );
}
