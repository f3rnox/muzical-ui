import normalizeYoutubeSearchQuery from "@/lib/youtube/normalize-youtube-search-query";
import type { YoutubeSearchTracksResult } from "@/lib/youtube/search-youtube-tracks-result";
import { YOUTUBE_SEARCH_CACHE_TTL_MS } from "@/lib/youtube/youtube-search-constants";

type CacheEntry = {
  at: number;
  result: YoutubeSearchTracksResult;
};

const searchCache = new Map<string, CacheEntry>();

/**
 * Read a cached YouTube search result if still fresh.
 */
export default function readCachedYoutubeSearchResult(
  query: string,
): YoutubeSearchTracksResult | null {
  const key = normalizeYoutubeSearchQuery(query);
  if (!key) return null;
  const entry = searchCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > YOUTUBE_SEARCH_CACHE_TTL_MS) {
    searchCache.delete(key);
    return null;
  }
  return entry.result;
}

export { searchCache as youtubeSearchResultCache };
