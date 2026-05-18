import { LIBRARY_AUDIO_EXTENSIONS } from "@/lib/library/constants";
import defaultLibraryScanPreferences from "@/lib/library/default-library-scan-preferences";
import type { LibraryScanPreferences } from "@/types/library-scan-preferences";

const STORAGE_KEY = "muzical.libraryScanPreferences";

const allowedExt = new Set<string>(LIBRARY_AUDIO_EXTENSIONS);

/**
 * Loads library scan preferences from localStorage with validation.
 */
export default function readStoredLibraryScanPreferences(): LibraryScanPreferences {
  const defaults = defaultLibraryScanPreferences();
  if (typeof window === "undefined") return defaults;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return defaults;
    const o = parsed as Record<string, unknown>;
    const maxScanDepth =
      typeof o.maxScanDepth === "number" &&
      Number.isFinite(o.maxScanDepth) &&
      o.maxScanDepth >= 0
        ? Math.floor(o.maxScanDepth)
        : defaults.maxScanDepth;
    const followSymlinks = o.followSymlinks === true;
    let enabledExtensions = defaults.enabledExtensions;
    if (Array.isArray(o.enabledExtensions)) {
      const filtered = o.enabledExtensions.filter(
        (x): x is string =>
          typeof x === "string" && allowedExt.has(x.toLowerCase()),
      );
      if (filtered.length > 0)
        enabledExtensions = [...new Set(filtered.map((x) => x.toLowerCase()))];
    }
    return { maxScanDepth, followSymlinks, enabledExtensions };
  } catch {
    return defaults;
  }
}

export { STORAGE_KEY as LIBRARY_SCAN_PREFERENCES_STORAGE_KEY };
