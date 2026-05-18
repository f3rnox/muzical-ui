import type { Playlist } from "@/types/playlist";

/**
 * Sort copy of playlists by `updatedAt` descending (most recent first).
 */
export default function sortPlaylistsByUpdated(
  playlists: readonly Playlist[],
): Playlist[] {
  return [...playlists].sort((a, b) => b.updatedAt - a.updatedAt);
}
