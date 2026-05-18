import type { Playlist } from "@/types/playlist";

/**
 * Returns a new playlist with one track moved from `fromIndex` to `toIndex`.
 */
export default function reorderPlaylistTrackIds(
  playlist: Playlist,
  fromIndex: number,
  toIndex: number,
): Playlist {
  const len = playlist.trackIds.length;
  if (fromIndex < 0 || fromIndex >= len) return playlist;
  const clampedTo = Math.max(0, Math.min(len - 1, toIndex));
  if (clampedTo === fromIndex) return playlist;
  const next = [...playlist.trackIds];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(clampedTo, 0, moved);
  return { ...playlist, trackIds: next, updatedAt: Date.now() };
}
