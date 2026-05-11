/** IndexedDB database name for saved library folder handles */
export const LIBRARY_DB_NAME = "muzical-library";

/** Object store for configured roots (includes directory handles) */
export const LIBRARY_STORE_NAME = "libraryRoots";

/** Object store for last successful scan snapshot (metadata only, no handles) */
export const LIBRARY_CATALOG_STORE_NAME = "libraryCatalog";

/** DB schema version */
export const LIBRARY_DB_VERSION = 3;

/** Lowercase extensions including dot */
export const LIBRARY_AUDIO_EXTENSIONS: readonly string[] = [
  ".mp3",
  ".flac",
  ".m4a",
  ".aac",
  ".ogg",
  ".opus",
  ".wav",
  ".webm",
  ".aiff",
  ".aif",
  ".alac",
  ".wma",
];
