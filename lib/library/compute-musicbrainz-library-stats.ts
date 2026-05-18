import {
  albumCompositeKey,
  artistDisplayName,
} from "@/lib/library/favorite-keys";
import isPersistedLibraryTrack from "@/lib/library/is-persisted-library-track";
import type { Track } from "@/types/track";

export type MusicBrainzLibraryStats = {
  trackCount: number;
  artistCount: number;
  albumCount: number;
  totalDurationSec: number;
  youtubeLinkedCount: number;
};

/**
 * Aggregate counts for tracks saved from MusicBrainz (not local files).
 */
export default function computeMusicBrainzLibraryStats(
  tracks: readonly Track[],
): MusicBrainzLibraryStats {
  const artists = new Set<string>();
  const albums = new Set<string>();
  let totalDurationSec = 0;
  let youtubeLinkedCount = 0;
  let trackCount = 0;

  for (const track of tracks) {
    if (!isPersistedLibraryTrack(track)) continue;
    trackCount += 1;
    artists.add(artistDisplayName(track.artist));
    albums.add(albumCompositeKey(track.album, track.artist));
    if (track.durationSec > 0) totalDurationSec += track.durationSec;
    if (track.youtubeVideoId?.trim()) youtubeLinkedCount += 1;
  }

  return {
    trackCount,
    artistCount: artists.size,
    albumCount: albums.size,
    totalDurationSec,
    youtubeLinkedCount,
  };
}
