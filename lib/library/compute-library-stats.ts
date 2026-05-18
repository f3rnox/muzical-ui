import {
  albumCompositeKey,
  artistDisplayName,
} from "@/lib/library/favorite-keys";
import type { Track } from "@/types/track";

export type LibraryStats = {
  trackCount: number;
  folderCount: number;
  artistCount: number;
  albumCount: number;
  totalDurationSec: number;
};

/**
 * Derives aggregate library counts from the scanned track catalog.
 */
export default function computeLibraryStats(
  tracks: readonly Track[],
  folderCount: number,
): LibraryStats {
  const artists = new Set<string>();
  const albums = new Set<string>();
  let totalDurationSec = 0;
  for (const t of tracks) {
    artists.add(artistDisplayName(t.artist));
    albums.add(albumCompositeKey(t.album, t.artist));
    if (t.durationSec > 0) totalDurationSec += t.durationSec;
  }
  return {
    trackCount: tracks.length,
    folderCount,
    artistCount: artists.size,
    albumCount: albums.size,
    totalDurationSec,
  };
}
