import isYoutubeQuotaErrorMessage from '@/lib/youtube/is-youtube-quota-error-message'
import markYoutubeDataApiBlocked from '@/lib/youtube/mark-youtube-data-api-blocked'
import readYoutubeDataApiBlocked from '@/lib/youtube/read-youtube-data-api-blocked'

type YoutubeSearchResponse = {
  items?: Array<{
    id?: { videoId?: string }
  }>
  error?: { message?: string; errors?: Array<{ reason?: string }> }
}

const videoIdCache = new Map<string, string>()

/**
 * Resolves a YouTube video id for a search query via YouTube Data API v3.
 */
export default async function searchYoutubeVideoId(
  query: string,
  apiKey: string,
  signal?: AbortSignal,
): Promise<string | null> {
  const q = query.trim()
  const key = apiKey.trim()
  if (!q || !key) return null
  if (readYoutubeDataApiBlocked()) return null

  const cacheKey = q.toLowerCase()
  const cached = videoIdCache.get(cacheKey)
  if (cached) return cached

  const url = new URL('https://www.googleapis.com/youtube/v3/search')
  url.searchParams.set('part', 'snippet')
  url.searchParams.set('type', 'video')
  url.searchParams.set('maxResults', '5')
  url.searchParams.set('videoEmbeddable', 'true')
  url.searchParams.set('q', q)
  url.searchParams.set('key', key)

  const response = await fetch(url, { signal })
  const body = (await response.json()) as YoutubeSearchResponse
  if (!response.ok) {
    const message = body.error?.message?.trim() ?? ''
    const quotaReason = body.error?.errors?.some((e) => e.reason === 'quotaExceeded') ?? false
    if (quotaReason || isYoutubeQuotaErrorMessage(message)) {
      markYoutubeDataApiBlocked()
      return null
    }
    return null
  }

  for (const item of body.items ?? []) {
    const id = item.id?.videoId?.trim()
    if (id) {
      videoIdCache.set(cacheKey, id)
      return id
    }
  }

  return null
}
