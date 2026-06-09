const STORAGE_KEY = "muzical.lastfmSessionKey";

export default function readStoredLastfmSessionKey(): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return typeof raw === "string" ? raw.trim() : "";
  } catch {
    return "";
  }
}

export { STORAGE_KEY as LASTFM_SESSION_KEY_STORAGE_KEY };
