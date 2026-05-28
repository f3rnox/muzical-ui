
import { GENIUS_API_KEY_STORAGE_KEY } from './genius-constants'

export default function readStoredGeniusApiKey(): string {
  if (typeof window === 'undefined') return ''
  try {
    return window.localStorage.getItem(GENIUS_API_KEY_STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}
