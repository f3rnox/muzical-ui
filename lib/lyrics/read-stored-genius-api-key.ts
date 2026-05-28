const GENIUS_API_KEY_STORAGE_KEY = 'muzical.genius.apiKey'

export default function readStoredGeniusApiKey(): string {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(GENIUS_API_KEY_STORAGE_KEY) ?? ''
}
