import defaultYoutubePreferences from "@/lib/youtube/default-youtube-preferences";
import {
  DEFAULT_PREFETCH_QUEUE_MAX_TRACKS,
  PREFETCH_QUEUE_MAX_TRACKS_MAX,
  PREFETCH_QUEUE_MAX_TRACKS_MIN,
  PREFETCH_QUEUE_VIDEO_IDS_STORAGE_KEY,
  PREFETCH_QUEUE_MAX_TRACKS_STORAGE_KEY,
} from "@/lib/youtube/youtube-preference-storage-keys";
import type { YoutubePreferences } from "@/types/youtube-preferences";

function readStoredBoolean(key: string, defaultValue: boolean): boolean {
  if (typeof window === "undefined") return defaultValue;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return defaultValue;
    const parsed: unknown = JSON.parse(raw);
    return parsed === true;
  } catch {
    return defaultValue;
  }
}

function readPrefetchMaxTracks(): number {
  const defaults = defaultYoutubePreferences();
  if (typeof window === "undefined") return defaults.prefetchQueueMaxTracks;
  const v = Number.parseInt(
    window.localStorage.getItem(PREFETCH_QUEUE_MAX_TRACKS_STORAGE_KEY) ?? "",
    10,
  );
  if (!Number.isFinite(v)) return DEFAULT_PREFETCH_QUEUE_MAX_TRACKS;
  return Math.min(
    PREFETCH_QUEUE_MAX_TRACKS_MAX,
    Math.max(PREFETCH_QUEUE_MAX_TRACKS_MIN, v),
  );
}

/**
 * Loads YouTube preferences from localStorage with validation.
 */
export default function readStoredYoutubePreferences(): YoutubePreferences {
  const defaults = defaultYoutubePreferences();
  return {
    prefetchQueueVideoIds: readStoredBoolean(
      PREFETCH_QUEUE_VIDEO_IDS_STORAGE_KEY,
      defaults.prefetchQueueVideoIds,
    ),
    prefetchQueueMaxTracks: readPrefetchMaxTracks(),
  };
}
