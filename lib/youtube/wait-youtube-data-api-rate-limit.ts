import { YOUTUBE_DATA_API_MIN_INTERVAL_MS } from '@/lib/youtube/youtube-search-constants'

let lastRequestAt = 0
let rateLimitChain: Promise<void> = Promise.resolve()

/**
 * Enforce a minimum interval between YouTube Data API v3 requests in this tab.
 */
export default async function waitYoutubeDataApiRateLimit(): Promise<void> {
  rateLimitChain = rateLimitChain.then(async () => {
    const now = Date.now()
    const waitMs = Math.max(0, YOUTUBE_DATA_API_MIN_INTERVAL_MS - (now - lastRequestAt))
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs))
    }
    lastRequestAt = Date.now()
  })
  await rateLimitChain
}
