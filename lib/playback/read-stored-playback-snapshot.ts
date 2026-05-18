import type { PersistedPlaybackSnapshot } from "@/types/persisted-playback-snapshot";

const STORAGE_KEY = "muzical.playbackSnapshot";

/**
 * Loads the last saved queue / playhead snapshot from localStorage.
 */
export default function readStoredPlaybackSnapshot(): PersistedPlaybackSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const o = parsed as Record<string, unknown>;
    if (!Array.isArray(o.trackIds)) return null;
    const trackIds = o.trackIds.filter(
      (x): x is string => typeof x === "string" && x.length > 0,
    );
    const activeTrackId =
      typeof o.activeTrackId === "string" ? o.activeTrackId : null;
    const positionSec =
      typeof o.positionSec === "number" &&
      Number.isFinite(o.positionSec) &&
      o.positionSec >= 0
        ? o.positionSec
        : 0;
    return { trackIds, activeTrackId, positionSec };
  } catch {
    return null;
  }
}

export { STORAGE_KEY as PLAYBACK_SNAPSHOT_STORAGE_KEY };
