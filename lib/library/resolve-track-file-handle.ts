import type { Track } from "@/types/track";

/**
 * Open a writable file handle for a library track.
 */
export default async function resolveTrackToFileHandle(
  track: Track,
  rootHandles: ReadonlyMap<string, FileSystemDirectoryHandle>,
): Promise<FileSystemFileHandle | null> {
  const lib = track.library;
  if (!lib) return null;
  const root = rootHandles.get(lib.rootId);
  if (!root) return null;
  const segments = lib.relativePath.split("/").filter(Boolean);
  if (segments.length === 0) return null;
  let dir = root;
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i];
    if (!seg) return null;
    dir = await dir.getDirectoryHandle(seg);
  }
  const fileName = segments[segments.length - 1];
  if (!fileName) return null;
  return dir.getFileHandle(fileName);
}
