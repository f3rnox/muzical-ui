import { PLAYBACK_SNAPSHOT_STORAGE_KEY } from "@/lib/playback/read-stored-playback-snapshot";
import type { PersistedPlaybackSnapshot } from "@/types/persisted-playback-snapshot";

/**
 * Persists queue / playhead snapshot to localStorage.
 */
export default function writeStoredPlaybackSnapshot(
  snapshot: PersistedPlaybackSnapshot,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      PLAYBACK_SNAPSHOT_STORAGE_KEY,
      JSON.stringify(snapshot),
    );
  } catch {
    /* ignore */
  }
}
