import type { Track } from "@/types/track";

/**
 * Attach file size and mtime to a library track for incremental rescans.
 */
export default function attachLibraryFileFingerprint(
  track: Track,
  file: File,
): Track {
  if (!track.library) return track;
  return {
    ...track,
    library: {
      ...track.library,
      fileLastModified: file.lastModified,
      fileSize: file.size,
    },
  };
}
