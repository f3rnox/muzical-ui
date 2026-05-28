
import { GENIUS_API_KEY_STORAGE_KEY } from './genius-constants'

export default function writeStoredGeniusApiKey(apiKey: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(GENIUS_API_KEY_STORAGE_KEY, apiKey)
  } catch {
    // ignore
  }
}
