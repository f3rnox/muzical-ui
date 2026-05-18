import { artistDisplayName } from "@/lib/library/favorite-keys";
import type { Track } from "@/types/track";

/**
 * Return catalog tracks credited to an artist display name.
 */
export default function tracksMatchingArtistName(
  tracks: readonly Track[],
  artistName: string,
): Track[] {
  const name = artistName.trim();
  if (!name) return [];
  return tracks.filter((t) => artistDisplayName(t.artist) === name);
}
