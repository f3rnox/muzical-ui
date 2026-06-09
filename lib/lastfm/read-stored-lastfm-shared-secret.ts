const STORAGE_KEY = "muzical.lastfmSharedSecret";

export default function readStoredLastfmSharedSecret(): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return typeof raw === "string" ? raw.trim() : "";
  } catch {
    return "";
  }
}

export { STORAGE_KEY as LASTFM_SHARED_SECRET_STORAGE_KEY };
