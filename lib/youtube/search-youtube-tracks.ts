import dedupeYoutubeSearchTracks from '@/lib/youtube/dedupe-youtube-search-tracks'
import fetchYoutubeSearchFromScrapeApi from '@/lib/youtube/fetch-youtube-search-from-scrape-api'
import isYoutubeQuotaError from '@/lib/youtube/is-youtube-quota-error'
import readCachedYoutubeSearchResult from '@/lib/youtube/read-cached-youtube-search-result'
import readStoredYoutubeApiKey from '@/lib/youtube/read-stored-youtube-api-key'
import readYoutubeDataApiBlocked from '@/lib/youtube/read-youtube-data-api-blocked'
import searchYoutubeVideos from '@/lib/youtube/search-youtube-videos'
import writeCachedYoutubeSearchResult from '@/lib/youtube/write-cached-youtube-search-result'
import youtubeSearchVideoToTrack from '@/lib/youtube/youtube-search-video-to-track'
import { YOUTUBE_SEARCH_MAX_RESULTS } from '@/lib/youtube/youtube-search-constants'
import type { Track } from '@/types/track'

export type YoutubeSearchSource = 'api' | 'scrape'

export type YoutubeSearchTracksResult = {
  tracks: Track[]
  source: YoutubeSearchSource
}

async function runYoutubeSearchTracks(
  query: string,
  signal?: AbortSignal,
): Promise<YoutubeSearchTracksResult> {
  const q = query.trim()
  if (!q) return { tracks: [], source: 'scrape' }

  const cached = readCachedYoutubeSearchResult(q)
  if (cached) return cached

  const apiKey = readStoredYoutubeApiKey().trim()
  if (apiKey && !readYoutubeDataApiBlocked()) {
    try {
      const videos = await searchYoutubeVideos(q, apiKey, signal, YOUTUBE_SEARCH_MAX_RESULTS)
      const result: YoutubeSearchTracksResult = {
        tracks: videos.map((video) => youtubeSearchVideoToTrack(video, q)),
        source: 'api',
      }
      writeCachedYoutubeSearchResult(q, result)
      return result
    } catch (err) {
      if (!isYoutubeQuotaError(err)) throw err
    }
  }

  const videos = await fetchYoutubeSearchFromScrapeApi(q, signal, YOUTUBE_SEARCH_MAX_RESULTS)
  const result: YoutubeSearchTracksResult = {
    tracks: videos.map((video) => youtubeSearchVideoToTrack(video, q)),
    source: 'scrape',
  }
  writeCachedYoutubeSearchResult(q, result)
  return result
}

/**
 * Search YouTube and return app tracks (Data API when available, else server scrape).
 */
export default async function searchYoutubeTracks(
  query: string,
  signal?: AbortSignal,
): Promise<YoutubeSearchTracksResult> {
  return dedupeYoutubeSearchTracks(query, () => runYoutubeSearchTracks(query, signal))
}
