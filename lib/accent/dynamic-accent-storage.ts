/** localStorage key for the dynamic accent from cover art feature */
export const DYNAMIC_ACCENT_ENABLED_KEY = "muzical.dynamicAccentEnabled" as const;

const DEFAULT_ENABLED = true;

const listeners = new Set<(enabled: boolean) => void>();

function notify(enabled: boolean): void {
  listeners.forEach((cb) => {
    try {
      cb(enabled);
    } catch {
      /* ignore listener error */
    }
  });
}

export function readDynamicAccentEnabled(): boolean {
  if (typeof window === "undefined") return DEFAULT_ENABLED;
  try {
    const raw = window.localStorage.getItem(DYNAMIC_ACCENT_ENABLED_KEY);
    if (raw === null) return DEFAULT_ENABLED;
    return raw === "true";
  } catch {
    return DEFAULT_ENABLED;
  }
}

export function writeDynamicAccentEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DYNAMIC_ACCENT_ENABLED_KEY, String(enabled));
  } catch {
    /* ignore */
  }
  // Notify same-document listeners (storage event only fires cross-document)
  notify(enabled);
  // Also fire a storage-like event for any other listeners
  try {
    window.dispatchEvent(
      new CustomEvent("muzical:dynamic-accent-changed", { detail: { enabled } }),
    );
  } catch {
    /* ignore */
  }
}

export function subscribeDynamicAccentEnabled(
  cb: (enabled: boolean) => void,
): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
