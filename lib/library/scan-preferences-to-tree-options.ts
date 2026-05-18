import type { LibraryScanPreferences } from "@/types/library-scan-preferences";
import type { ScanTreeOptions } from "@/types/scan-tree-options";

/**
 * Converts stored scan preferences into options for the directory walk.
 */
export default function scanPreferencesToTreeOptions(
  prefs: LibraryScanPreferences,
): ScanTreeOptions {
  return {
    maxScanDepth: prefs.maxScanDepth,
    followSymlinks: prefs.followSymlinks,
    enabledExtensions: new Set(prefs.enabledExtensions),
  };
}
