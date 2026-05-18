import type { Playlist } from "@/types/playlist";

/**
 * Returns a new playlist with deduplicated `trackIds` appended at the end.
 * No-op (returns the original) when no new ids would be added.
 */
export default function appendTrackIdsToPlaylist(
  playlist: Playlist,
  trackIds: readonly string[],
): Playlist {
  if (trackIds.length === 0) return playlist;
  const existing = new Set(playlist.trackIds);
  const additions: string[] = [];
  for (const id of trackIds) {
    if (!id || existing.has(id)) continue;
    existing.add(id);
    additions.push(id);
  }
  if (additions.length === 0) return playlist;
  return {
    ...playlist,
    trackIds: [...playlist.trackIds, ...additions],
    updatedAt: Date.now(),
  };
}
