import { PLAYLIST_NAME_MAX_LENGTH } from "@/lib/playlists/playlist-storage-key";

/**
 * Trims whitespace, collapses repeats, and clamps to the playlist name limit.
 */
export default function normalizePlaylistName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, PLAYLIST_NAME_MAX_LENGTH);
}
