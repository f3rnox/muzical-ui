import type { Playlist } from "@/types/playlist";
import parseStoredPlaylists from "@/lib/playlists/parse-stored-playlists";
import { PLAYLISTS_STORAGE_KEY } from "@/lib/playlists/playlist-storage-key";

/**
 * Reads the persisted playlist list from localStorage.
 */
export default function readStoredPlaylists(): Playlist[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PLAYLISTS_STORAGE_KEY);
    if (!raw) return [];
    return parseStoredPlaylists(JSON.parse(raw));
  } catch {
    return [];
  }
}
