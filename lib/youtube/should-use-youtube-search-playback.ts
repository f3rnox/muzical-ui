import readYoutubeDataApiBlocked from '@/lib/youtube/read-youtube-data-api-blocked'

/**
 * True when playback should use the iframe search playlist instead of a resolved video id.
 */
export default function shouldUseYoutubeSearchPlayback(
  youtubeQuery: string | undefined,
  youtubeVideoId: string | undefined,
  hasApiKey: boolean,
  forceSearchFallback: boolean,
): boolean {
  const query = youtubeQuery?.trim()
  if (!query) return false
  if (youtubeVideoId?.trim()) return false
  if (forceSearchFallback) return true
  if (readYoutubeDataApiBlocked()) return true
  if (!hasApiKey) return true
  return false
}
