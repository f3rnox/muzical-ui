const MUSICBRAINZ_MIN_INTERVAL_MS = 1100

let lastRequestAt = 0
let rateLimitChain: Promise<void> = Promise.resolve()

/**
 * Enforce MusicBrainz 1 req/s policy across all API calls in this process.
 */
export async function waitMusicBrainzRateLimit(): Promise<void> {
  rateLimitChain = rateLimitChain.then(async () => {
    const now = Date.now()
    const waitMs = Math.max(0, MUSICBRAINZ_MIN_INTERVAL_MS - (now - lastRequestAt))
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs))
    }
    lastRequestAt = Date.now()
  })
  await rateLimitChain
}
