import {
  isAudioFilename,
  stripAudioExtension,
} from "@/lib/library/audio-filename";
import { extractTagsFromAudioFile } from "@/lib/library/read-audio-metadata";
import type { Track } from "@/types/track";

const METADATA_PARSE_CONCURRENCY = 6;

export type PendingAudioFile = {
  rootId: string;
  rootDisplayName: string;
  relativePath: string;
  handle: FileSystemFileHandle;
};

/**
 * Walks a directory tree and collects audio file handles (no I/O on file bodies yet).
 */
export async function collectPendingAudioFiles(
  rootId: string,
  rootDisplayName: string,
  dir: FileSystemDirectoryHandle,
  pathPrefix: string,
  out: PendingAudioFile[],
): Promise<void> {
  for await (const [name, entry] of dir.entries()) {
    const rel = pathPrefix ? `${pathPrefix}/${name}` : name;
    if (entry.kind === "directory") {
      await collectPendingAudioFiles(
        rootId,
        rootDisplayName,
        entry as FileSystemDirectoryHandle,
        rel,
        out,
      );
    } else if (entry.kind === "file" && isAudioFilename(name)) {
      out.push({
        rootId,
        rootDisplayName,
        relativePath: rel,
        handle: entry as FileSystemFileHandle,
      });
    }
  }
}

function basenameFromRelativePath(relativePath: string): string {
  const i = relativePath.lastIndexOf("/");
  return i >= 0 ? relativePath.slice(i + 1) : relativePath;
}

function folderAlbumFallback(
  relativePath: string,
  rootDisplayName: string,
): string {
  const segments = relativePath.split("/").filter(Boolean);
  if (segments.length > 1) {
    return segments[segments.length - 2] ?? rootDisplayName;
  }
  return rootDisplayName;
}

async function pendingFileToTrack(p: PendingAudioFile): Promise<Track> {
  const fileName = basenameFromRelativePath(p.relativePath);
  const fallbackTitle = stripAudioExtension(fileName);
  const albumFolder = folderAlbumFallback(p.relativePath, p.rootDisplayName);
  try {
    const file = await p.handle.getFile();
    const tags = await extractTagsFromAudioFile(file);
    return {
      id: `lib:${p.rootId}:${p.relativePath}`,
      title: tags?.title ? tags.title : fallbackTitle,
      artist: tags?.artist ? tags.artist : "Unknown artist",
      album: tags?.album ? tags.album : albumFolder,
      durationSec:
        tags?.durationSec && tags.durationSec > 0 ? tags.durationSec : 0,
      audioUrl: null,
      library: { rootId: p.rootId, relativePath: p.relativePath },
    };
  } catch {
    return {
      id: `lib:${p.rootId}:${p.relativePath}`,
      title: fallbackTitle,
      artist: "Unknown artist",
      album: albumFolder,
      durationSec: 0,
      audioUrl: null,
      library: { rootId: p.rootId, relativePath: p.relativePath },
    };
  }
}

export type MetadataScanProgress = {
  filesDone: number;
  filesTotal: number;
};

export type DirectoryScanProgress =
  | { phase: "walk" }
  | { phase: "metadata"; filesDone: number; filesTotal: number };

/**
 * Opens files in bounded parallel, parses tags, and returns `Track` rows sorted by path.
 */
export async function buildTracksFromPending(
  pending: readonly PendingAudioFile[],
  onProgress?: (progress: MetadataScanProgress) => void,
): Promise<Track[]> {
  if (pending.length === 0) return [];
  const tracks: Track[] = new Array(pending.length);
  let nextIndex = 0;
  let filesDone = 0;
  const filesTotal = pending.length;

  const report = (): void => {
    onProgress?.({ filesDone, filesTotal });
  };

  report();

  const worker = async (): Promise<void> => {
    for (;;) {
      const i = nextIndex++;
      if (i >= pending.length) break;
      tracks[i] = await pendingFileToTrack(pending[i] as PendingAudioFile);
      filesDone += 1;
      report();
    }
  };

  const n = Math.min(METADATA_PARSE_CONCURRENCY, pending.length);
  await Promise.all(Array.from({ length: n }, () => worker()));
  return tracks;
}

/**
 * Scans one library root: walk tree, read metadata per audio file, return tracks.
 */
export async function scanDirectoryForTracks(
  rootId: string,
  rootDisplayName: string,
  dir: FileSystemDirectoryHandle,
  onProgress?: (progress: DirectoryScanProgress) => void,
): Promise<Track[]> {
  onProgress?.({ phase: "walk" });
  const pending: PendingAudioFile[] = [];
  await collectPendingAudioFiles(rootId, rootDisplayName, dir, "", pending);
  onProgress?.({ phase: "metadata", filesDone: 0, filesTotal: pending.length });
  return buildTracksFromPending(pending, (metadata) => {
    onProgress?.({ phase: "metadata", ...metadata });
  });
}
