const STORAGE_KEY = 'muzical.youtubeApiKey'

/**
 * Loads the YouTube Data API key from localStorage.
 */
export default function readStoredYoutubeApiKey(): string {
  if (typeof window === 'undefined') return ''
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return typeof raw === 'string' ? raw.trim() : ''
  } catch {
    return ''
  }
}

export { STORAGE_KEY as YOUTUBE_API_KEY_STORAGE_KEY }
