import dedupeYoutubeSearchTracks from "@/lib/youtube/dedupe-youtube-search-tracks";
import searchYoutubeTracksPage from "@/lib/youtube/search-youtube-tracks-page";
import type { YoutubeSearchTracksResult } from "@/lib/youtube/search-youtube-tracks-result";

export type { YoutubeSearchSource } from "@/lib/youtube/search-youtube-tracks-result";
export type { YoutubeSearchTracksResult } from "@/lib/youtube/search-youtube-tracks-result";

/**
 * Search YouTube and return app tracks (first page only).
 */
export default async function searchYoutubeTracks(
  query: string,
  signal?: AbortSignal,
): Promise<YoutubeSearchTracksResult> {
  return dedupeYoutubeSearchTracks(query, async () => {
    const page = await searchYoutubeTracksPage(query, signal);
    return {
      tracks: page.tracks,
      source: page.source,
      nextPageToken: page.nextPageToken,
    };
  });
}
