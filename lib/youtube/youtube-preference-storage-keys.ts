export const PREFETCH_QUEUE_VIDEO_IDS_STORAGE_KEY =
  "muzical.youtubePrefetchQueueVideoIds" as const;
export const PREFETCH_QUEUE_MAX_TRACKS_STORAGE_KEY =
  "muzical.youtubePrefetchQueueMaxTracks" as const;

/** Default max queue tracks to prefetch when enabled. */
export const DEFAULT_PREFETCH_QUEUE_MAX_TRACKS = 8;

/** Allowed range for prefetch limit in settings. */
export const PREFETCH_QUEUE_MAX_TRACKS_MIN = 1;
export const PREFETCH_QUEUE_MAX_TRACKS_MAX = 32;
