import { LIBRARY_SCAN_PREFERENCES_STORAGE_KEY } from "@/lib/library/read-stored-library-scan-preferences";
import type { LibraryScanPreferences } from "@/types/library-scan-preferences";

/**
 * Persists library scan preferences to localStorage.
 */
export default function writeStoredLibraryScanPreferences(
  prefs: LibraryScanPreferences,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      LIBRARY_SCAN_PREFERENCES_STORAGE_KEY,
      JSON.stringify(prefs),
    );
  } catch {
    /* ignore */
  }
}
