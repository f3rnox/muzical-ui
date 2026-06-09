import { LASTFM_USERNAME_STORAGE_KEY } from "@/lib/lastfm/read-stored-lastfm-username";

export default function writeStoredLastfmUsername(username: string): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed = username.trim();
    if (trimmed) {
      window.localStorage.setItem(LASTFM_USERNAME_STORAGE_KEY, trimmed);
    } else {
      window.localStorage.removeItem(LASTFM_USERNAME_STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
}
