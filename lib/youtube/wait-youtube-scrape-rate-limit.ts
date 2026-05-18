import { YOUTUBE_SCRAPE_MIN_INTERVAL_MS } from '@/lib/youtube/youtube-search-constants'

let lastRequestAt = 0
let rateLimitChain: Promise<void> = Promise.resolve()

/**
 * Enforce a minimum interval between YouTube HTML scrape requests on the server.
 */
export default async function waitYoutubeScrapeRateLimit(): Promise<void> {
  rateLimitChain = rateLimitChain.then(async () => {
    const now = Date.now()
    const waitMs = Math.max(0, YOUTUBE_SCRAPE_MIN_INTERVAL_MS - (now - lastRequestAt))
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs))
    }
    lastRequestAt = Date.now()
  })
  await rateLimitChain
}
