import fetchYoutubeVideoIdFromResolveApi from "@/lib/youtube/fetch-youtube-video-id-from-resolve-api";
import readStoredYoutubeApiKey from "@/lib/youtube/read-stored-youtube-api-key";
import readYoutubeDataApiBlocked from "@/lib/youtube/read-youtube-data-api-blocked";
import searchYoutubeVideoId from "@/lib/youtube/search-youtube-video-id";
import { readCachedYoutubeVideoId } from "@/lib/youtube/youtube-video-id-cache";

/**
 * Resolve a YouTube video id for a query (Data API when configured, else server scrape).
 */
export default async function resolveYoutubeVideoId(
  query: string,
  signal?: AbortSignal,
): Promise<string | null> {
  const q = query.trim();
  if (!q) return null;

  const cached = readCachedYoutubeVideoId(q);
  if (cached) return cached;

  const apiKey = readStoredYoutubeApiKey().trim();
  if (apiKey && !readYoutubeDataApiBlocked()) {
    const fromApi = await searchYoutubeVideoId(q, apiKey, signal);
    if (fromApi) return fromApi;
  }

  return fetchYoutubeVideoIdFromResolveApi(q, signal);
}
