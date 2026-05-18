const videoIdCache = new Map<string, string>();

/**
 * Read a cached YouTube video id for a search query.
 */
export function readCachedYoutubeVideoId(query: string): string | null {
  const key = query.trim().toLowerCase();
  if (!key) return null;
  return videoIdCache.get(key) ?? null;
}

/**
 * Store a YouTube video id for a search query.
 */
export function writeCachedYoutubeVideoId(
  query: string,
  videoId: string,
): void {
  const key = query.trim().toLowerCase();
  const id = videoId.trim();
  if (!key || !id) return;
  videoIdCache.set(key, id);
}
