import type { Track } from "@/types/track";

export type LibraryFileFingerprint = {
  fileLastModified: number;
  fileSize: number;
};

/**
 * Read stored file fingerprint from a library track, if present.
 */
export default function readTrackLibraryFingerprint(
  track: Track,
): LibraryFileFingerprint | null {
  const ref = track.library;
  if (!ref) return null;
  const { fileLastModified, fileSize } = ref;
  if (
    typeof fileLastModified !== "number" ||
    !Number.isFinite(fileLastModified) ||
    typeof fileSize !== "number" ||
    !Number.isFinite(fileSize) ||
    fileSize < 0
  ) {
    return null;
  }
  return { fileLastModified, fileSize };
}
