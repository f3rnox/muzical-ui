import { LASTFM_SHARED_SECRET_STORAGE_KEY } from "@/lib/lastfm/read-stored-lastfm-shared-secret";

export default function writeStoredLastfmSharedSecret(secret: string): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed = secret.trim();
    if (trimmed) {
      window.localStorage.setItem(LASTFM_SHARED_SECRET_STORAGE_KEY, trimmed);
    } else {
      window.localStorage.removeItem(LASTFM_SHARED_SECRET_STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
}
