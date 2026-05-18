import { LIBRARY_AUDIO_EXTENSIONS } from "@/lib/library/constants";
import type { LibraryScanPreferences } from "@/types/library-scan-preferences";

/**
 * Default scan preferences: all extensions, unlimited depth, no symlink follow.
 */
export default function defaultLibraryScanPreferences(): LibraryScanPreferences {
  return {
    maxScanDepth: 0,
    followSymlinks: false,
    enabledExtensions: [...LIBRARY_AUDIO_EXTENSIONS],
  };
}
