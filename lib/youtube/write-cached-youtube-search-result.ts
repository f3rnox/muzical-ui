import normalizeYoutubeSearchQuery from "@/lib/youtube/normalize-youtube-search-query";
import { youtubeSearchResultCache } from "@/lib/youtube/read-cached-youtube-search-result";
import type { YoutubeSearchTracksResult } from "@/lib/youtube/search-youtube-tracks-result";

/**
 * Store a YouTube search result in the in-memory cache.
 */
export default function writeCachedYoutubeSearchResult(
  query: string,
  result: YoutubeSearchTracksResult,
): void {
  const key = normalizeYoutubeSearchQuery(query);
  if (!key) return;
  youtubeSearchResultCache.set(key, { at: Date.now(), result });
}
