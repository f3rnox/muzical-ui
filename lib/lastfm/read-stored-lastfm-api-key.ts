const STORAGE_KEY = "muzical.lastfmApiKey";

/**
 * Loads the Last.fm API key from localStorage.
 */
export default function readStoredLastfmApiKey(): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return typeof raw === "string" ? raw.trim() : "";
  } catch {
    return "";
  }
}

export { STORAGE_KEY as LASTFM_API_KEY_STORAGE_KEY };
