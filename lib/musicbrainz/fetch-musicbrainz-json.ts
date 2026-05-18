import { waitMusicBrainzRateLimit } from '@/lib/musicbrainz/wait-musicbrainz-rate-limit'

const MUSICBRAINZ_USER_AGENT =
  'MuzicalUI/1.0 (https://github.com/f3rnox/muzical-ui)'

const RETRYABLE_STATUSES = new Set([503, 502, 429])
const MAX_ATTEMPTS = 3

/**
 * GET a MusicBrainz JSON API URL with rate limiting and retries.
 */
export async function fetchMusicBrainzJson<T>(
  url: URL,
  signal?: AbortSignal,
): Promise<T> {
  const urlString = url.toString()
  let lastError: Error | null = null

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError')
    }

    await waitMusicBrainzRateLimit()

    let response: Response
    try {
      response = await fetch(urlString, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': MUSICBRAINZ_USER_AGENT,
        },
        signal,
      })
    } catch (error: unknown) {
      if (
        signal?.aborted ||
        (error instanceof Error && error.name === 'AbortError') ||
        (typeof error === 'object' &&
          error !== null &&
          'name' in error &&
          error.name === 'AbortError')
      ) {
        throw error
      }
      console.error('[MusicBrainz] request failed', { url: urlString, error })
      throw error
    }

    if (response.ok) {
      return (await response.json()) as T
    }

    let bodySnippet = ''
    try {
      bodySnippet = (await response.text()).slice(0, 300)
    } catch {
      /* ignore */
    }

    lastError = new Error(`MusicBrainz request failed (${response.status})`)
    console.error('[MusicBrainz] request failed', {
      url: urlString,
      status: response.status,
      statusText: response.statusText,
      body: bodySnippet || undefined,
      attempt: attempt + 1,
    })

    if (!RETRYABLE_STATUSES.has(response.status) || attempt >= MAX_ATTEMPTS - 1) {
      throw lastError
    }

    await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)))
  }

  throw lastError ?? new Error('MusicBrainz request failed')
}
