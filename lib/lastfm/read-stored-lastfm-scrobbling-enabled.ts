const STORAGE_KEY = "muzical.lastfmScrobblingEnabled";
const DEFAULT_ENABLED = false;

const listeners = new Set<(enabled: boolean) => void>();

function notify(enabled: boolean): void {
  listeners.forEach((cb) => {
    try {
      cb(enabled);
    } catch {
      /* ignore */
    }
  });
}

export default function readStoredLastfmScrobblingEnabled(): boolean {
  if (typeof window === "undefined") return DEFAULT_ENABLED;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return DEFAULT_ENABLED;
    return raw === "true";
  } catch {
    return DEFAULT_ENABLED;
  }
}

export function writeStoredLastfmScrobblingEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(enabled));
  } catch {
    /* ignore */
  }
  notify(enabled);
  try {
    window.dispatchEvent(
      new CustomEvent("muzical:lastfm-scrobbling-changed", { detail: { enabled } }),
    );
  } catch {
    /* ignore */
  }
}

export function subscribeLastfmScrobblingEnabled(
  cb: (enabled: boolean) => void,
): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export { STORAGE_KEY as LASTFM_SCROBBLING_ENABLED_STORAGE_KEY };
