import { LASTFM_SESSION_KEY_STORAGE_KEY } from "@/lib/lastfm/read-stored-lastfm-session-key";

export default function writeStoredLastfmSessionKey(sessionKey: string): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed = sessionKey.trim();
    if (trimmed) {
      window.localStorage.setItem(LASTFM_SESSION_KEY_STORAGE_KEY, trimmed);
    } else {
      window.localStorage.removeItem(LASTFM_SESSION_KEY_STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
}
