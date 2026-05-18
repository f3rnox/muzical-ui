import type { Playlist } from "@/types/playlist";
import {
  PLAYLISTS_LIMIT,
  PLAYLISTS_STORAGE_KEY,
} from "@/lib/playlists/playlist-storage-key";

/**
 * Persists the playlist list to localStorage, capped at {@link PLAYLISTS_LIMIT}.
 */
export default function writeStoredPlaylists(
  playlists: readonly Playlist[],
): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed = playlists.slice(0, PLAYLISTS_LIMIT);
    window.localStorage.setItem(PLAYLISTS_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    /* ignore quota / private mode */
  }
}
