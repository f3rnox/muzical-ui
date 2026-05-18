import type { LibraryFileFingerprint } from "@/lib/library/read-track-library-fingerprint";

/**
 * True when a file matches a previously scanned fingerprint.
 */
export default function isLibraryFileUnchanged(
  file: File,
  fingerprint: LibraryFileFingerprint,
): boolean {
  return (
    file.lastModified === fingerprint.fileLastModified &&
    file.size === fingerprint.fileSize
  );
}
