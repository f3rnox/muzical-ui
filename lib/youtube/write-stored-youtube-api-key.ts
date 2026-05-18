import { YOUTUBE_API_KEY_STORAGE_KEY } from '@/lib/youtube/read-stored-youtube-api-key'

/**
 * Persists the YouTube Data API key to localStorage.
 */
export default function writeStoredYoutubeApiKey(apiKey: string): void {
  if (typeof window === 'undefined') return
  try {
    const trimmed = apiKey.trim()
    if (trimmed) {
      window.localStorage.setItem(YOUTUBE_API_KEY_STORAGE_KEY, trimmed)
    } else {
      window.localStorage.removeItem(YOUTUBE_API_KEY_STORAGE_KEY)
    }
  } catch {
    /* ignore */
  }
}
