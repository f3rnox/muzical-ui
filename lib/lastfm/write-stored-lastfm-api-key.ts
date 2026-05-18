import { LASTFM_API_KEY_STORAGE_KEY } from "@/lib/lastfm/read-stored-lastfm-api-key";

/**
 * Persists the Last.fm API key to localStorage.
 */
export default function writeStoredLastfmApiKey(apiKey: string): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed = apiKey.trim();
    if (trimmed) {
      window.localStorage.setItem(LASTFM_API_KEY_STORAGE_KEY, trimmed);
    } else {
      window.localStorage.removeItem(LASTFM_API_KEY_STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
}
