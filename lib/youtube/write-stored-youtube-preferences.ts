import {
  PREFETCH_QUEUE_MAX_TRACKS_MAX,
  PREFETCH_QUEUE_MAX_TRACKS_MIN,
  PREFETCH_QUEUE_VIDEO_IDS_STORAGE_KEY,
  PREFETCH_QUEUE_MAX_TRACKS_STORAGE_KEY,
} from "@/lib/youtube/youtube-preference-storage-keys";
import type { YoutubePreferences } from "@/types/youtube-preferences";

/**
 * Persists YouTube preferences to localStorage.
 */
export default function writeStoredYoutubePreferences(
  prefs: YoutubePreferences,
): void {
  if (typeof window === "undefined") return;
  const maxTracks = Math.min(
    PREFETCH_QUEUE_MAX_TRACKS_MAX,
    Math.max(
      PREFETCH_QUEUE_MAX_TRACKS_MIN,
      Math.floor(prefs.prefetchQueueMaxTracks),
    ),
  );
  try {
    window.localStorage.setItem(
      PREFETCH_QUEUE_VIDEO_IDS_STORAGE_KEY,
      JSON.stringify(prefs.prefetchQueueVideoIds),
    );
    window.localStorage.setItem(
      PREFETCH_QUEUE_MAX_TRACKS_STORAGE_KEY,
      String(maxTracks),
    );
  } catch {
    /* ignore */
  }
}
