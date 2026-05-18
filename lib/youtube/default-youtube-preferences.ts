import { DEFAULT_PREFETCH_QUEUE_MAX_TRACKS } from "@/lib/youtube/youtube-preference-storage-keys";
import type { YoutubePreferences } from "@/types/youtube-preferences";

/**
 * Factory defaults for YouTube preferences on a fresh install.
 */
export default function defaultYoutubePreferences(): YoutubePreferences {
  return {
    prefetchQueueVideoIds: true,
    prefetchQueueMaxTracks: DEFAULT_PREFETCH_QUEUE_MAX_TRACKS,
  };
}
