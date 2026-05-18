import type { Playlist } from "@/types/playlist";

/**
 * Returns a new playlist with the given track ids removed. No-op (returns the
 * original) when nothing matches.
 */
export default function removeTrackIdsFromPlaylist(
  playlist: Playlist,
  trackIds: readonly string[],
): Playlist {
  if (trackIds.length === 0) return playlist;
  const removeSet = new Set(trackIds);
  const next = playlist.trackIds.filter((id) => !removeSet.has(id));
  if (next.length === playlist.trackIds.length) return playlist;
  return { ...playlist, trackIds: next, updatedAt: Date.now() };
}
