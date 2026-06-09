const STORAGE_KEY = "muzical.lastfmUsername";

export default function readStoredLastfmUsername(): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return typeof raw === "string" ? raw.trim() : "";
  } catch {
    return "";
  }
}

export { STORAGE_KEY as LASTFM_USERNAME_STORAGE_KEY };
