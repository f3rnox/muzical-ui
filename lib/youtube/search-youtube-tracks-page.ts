import fetchYoutubeSearchFromScrapeApi from "@/lib/youtube/fetch-youtube-search-from-scrape-api";
import isYoutubeQuotaError from "@/lib/youtube/is-youtube-quota-error";
import readCachedYoutubeSearchResult from "@/lib/youtube/read-cached-youtube-search-result";
import readStoredYoutubeApiKey from "@/lib/youtube/read-stored-youtube-api-key";
import readYoutubeDataApiBlocked from "@/lib/youtube/read-youtube-data-api-blocked";
import searchYoutubeVideos from "@/lib/youtube/search-youtube-videos";
import writeCachedYoutubeSearchResult from "@/lib/youtube/write-cached-youtube-search-result";
import youtubeSearchVideoToTrack from "@/lib/youtube/youtube-search-video-to-track";
import { YOUTUBE_SEARCH_PAGE_SIZE } from "@/lib/youtube/youtube-search-constants";
import type { YoutubeSearchPageResult } from "@/types/youtube-search-page";

export type SearchYoutubeTracksPageOptions = {
  pageToken?: string;
  excludeVideoIds?: readonly string[];
};

/**
 * Search YouTube and return one page of tracks (Data API when available, else scrape).
 */
export default async function searchYoutubeTracksPage(
  query: string,
  signal?: AbortSignal,
  options?: SearchYoutubeTracksPageOptions,
): Promise<YoutubeSearchPageResult> {
  const q = query.trim();
  if (!q) {
    return { tracks: [], source: "scrape", hasMore: false };
  }

  const isFirstPage =
    !options?.pageToken && (options?.excludeVideoIds?.length ?? 0) === 0;
  if (isFirstPage) {
    const cached = readCachedYoutubeSearchResult(q);
    if (cached) {
      return {
        tracks: cached.tracks,
        source: cached.source,
        nextPageToken: cached.nextPageToken,
        hasMore:
          Boolean(cached.nextPageToken) ||
          cached.tracks.length >= YOUTUBE_SEARCH_PAGE_SIZE,
      };
    }
  }

  const exclude = new Set(options?.excludeVideoIds ?? []);
  const apiKey = readStoredYoutubeApiKey().trim();

  if (apiKey && !readYoutubeDataApiBlocked()) {
    try {
      const { videos, nextPageToken } = await searchYoutubeVideos(
        q,
        apiKey,
        signal,
        YOUTUBE_SEARCH_PAGE_SIZE,
        options?.pageToken,
      );
      const filtered = videos.filter((v) => !exclude.has(v.videoId));
      const tracks = filtered.map((video) =>
        youtubeSearchVideoToTrack(video, q),
      );
      const result: YoutubeSearchPageResult = {
        tracks,
        source: "api",
        nextPageToken,
        hasMore: Boolean(nextPageToken),
      };
      if (isFirstPage) {
        writeCachedYoutubeSearchResult(q, {
          tracks: result.tracks,
          source: result.source,
          nextPageToken: result.nextPageToken,
        });
      }
      return result;
    } catch (err) {
      if (!isYoutubeQuotaError(err)) throw err;
    }
  }

  const fetchLimit = Math.min(50, exclude.size + YOUTUBE_SEARCH_PAGE_SIZE + 5);
  const videos = await fetchYoutubeSearchFromScrapeApi(q, signal, fetchLimit);
  const filtered = videos
    .filter((v) => !exclude.has(v.videoId))
    .slice(0, YOUTUBE_SEARCH_PAGE_SIZE);
  const tracks = filtered.map((video) => youtubeSearchVideoToTrack(video, q));
  const result: YoutubeSearchPageResult = {
    tracks,
    source: "scrape",
    hasMore: filtered.length >= YOUTUBE_SEARCH_PAGE_SIZE,
  };
  if (isFirstPage) {
    writeCachedYoutubeSearchResult(q, {
      tracks: result.tracks,
      source: result.source,
    });
  }
  return result;
}
