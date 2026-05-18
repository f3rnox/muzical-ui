import normalizeYoutubeSearchQuery from '@/lib/youtube/normalize-youtube-search-query'
import type { YoutubeSearchTracksResult } from '@/lib/youtube/search-youtube-tracks'

const inFlight = new Map<string, Promise<YoutubeSearchTracksResult>>()

/**
 * Run a search once per normalized query while a request is in flight.
 */
export default function dedupeYoutubeSearchTracks(
  query: string,
  run: () => Promise<YoutubeSearchTracksResult>,
): Promise<YoutubeSearchTracksResult> {
  const key = normalizeYoutubeSearchQuery(query)
  if (!key) return run()

  const existing = inFlight.get(key)
  if (existing) return existing

  const promise = run().finally(() => {
    if (inFlight.get(key) === promise) inFlight.delete(key)
  })
  inFlight.set(key, promise)
  return promise
}
