const GENIUS_API_KEY_STORAGE_KEY = 'muzical.genius.apiKey'

export default function writeStoredGeniusApiKey(key: string): void {
  if (typeof window === 'undefined') return
  const k = key.trim()
  if (k) {
    window.localStorage.setItem(GENIUS_API_KEY_STORAGE_KEY, k)
  } else {
    window.localStorage.removeItem(GENIUS_API_KEY_STORAGE_KEY)
  }
}
