/** User-configurable options applied during library folder scans. */
export type LibraryScanPreferences = {
  /** `0` scans all nested folders; otherwise max subdirectory depth from each root. */
  maxScanDepth: number;
  /** When true, directory symlinks may be followed (browser-dependent); cycles are skipped. */
  followSymlinks: boolean;
  /** Lowercase extensions including dot, subset of `LIBRARY_AUDIO_EXTENSIONS`. */
  enabledExtensions: string[];
};
