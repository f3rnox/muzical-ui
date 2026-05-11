import type { Track } from "@/types/track";

/**
 * Opens a `File` for a library track using the saved directory handle map.
 */
export async function resolveTrackToFile(
  track: Track,
  rootHandles: ReadonlyMap<string, FileSystemDirectoryHandle>,
): Promise<File | null> {
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
  const fh = await dir.getFileHandle(fileName);
  return fh.getFile();
}
