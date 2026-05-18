import {
  isAudioFilename,
  stripAudioExtension,
} from "@/lib/library/audio-filename";
import attachLibraryFileFingerprint from "@/lib/library/attach-library-file-fingerprint";
import buildLibraryTrackScanCache from "@/lib/library/build-library-track-scan-cache";
import isLibraryFileUnchanged from "@/lib/library/is-library-file-unchanged";
import logLibraryScanSongTiming from "@/lib/library/log-library-scan-song-timing";
import readTrackLibraryFingerprint from "@/lib/library/read-track-library-fingerprint";
import { extractTagsFromAudioFile } from "@/lib/library/read-audio-metadata";
import type { ScanTreeOptions } from "@/types/scan-tree-options";
import type { Track } from "@/types/track";

const METADATA_PARSE_CONCURRENCY = 8;

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
  depth: number,
  options: ScanTreeOptions,
  visitedDirs: Set<string>,
  out: PendingAudioFile[],
): Promise<void> {
  if (options.maxScanDepth > 0 && depth >= options.maxScanDepth) return;

  for await (const [name, entry] of dir.entries()) {
    const rel = pathPrefix ? `${pathPrefix}/${name}` : name;
    if (entry.kind === "directory") {
      if (options.followSymlinks && visitedDirs.has(rel)) continue;
      const nextVisited = options.followSymlinks
        ? new Set(visitedDirs)
        : visitedDirs;
      if (options.followSymlinks) nextVisited.add(rel);
      await collectPendingAudioFiles(
        rootId,
        rootDisplayName,
        entry as FileSystemDirectoryHandle,
        rel,
        depth + 1,
        options,
        nextVisited,
        out,
      );
    } else if (
      entry.kind === "file" &&
      isAudioFilename(name, options.enabledExtensions)
    ) {
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

function fallbackTrack(
  p: PendingAudioFile,
  enabledExtensions: ReadonlySet<string>,
): Track {
  const fileName = basenameFromRelativePath(p.relativePath);
  const fallbackTitle = stripAudioExtension(fileName, enabledExtensions);
  const albumFolder = folderAlbumFallback(p.relativePath, p.rootDisplayName);
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

async function pendingFileToTrack(
  p: PendingAudioFile,
  enabledExtensions: ReadonlySet<string>,
  scanCache: Map<string, Track>,
  logScanTiming: boolean,
): Promise<Track> {
  const trackId = `lib:${p.rootId}:${p.relativePath}`;
  const cached = scanCache.get(trackId);
  const cachedFingerprint = cached ? readTrackLibraryFingerprint(cached) : null;
  const startedAt = logScanTiming ? performance.now() : 0;

  const finish = (
    outcome: "cached" | "parsed" | "error",
    track: Track,
  ): Track => {
    if (logScanTiming) {
      logLibraryScanSongTiming({
        relativePath: p.relativePath,
        rootDisplayName: p.rootDisplayName,
        durationMs: performance.now() - startedAt,
        outcome,
      });
    }
    return track;
  };

  try {
    const file = await p.handle.getFile();
    if (
      cached &&
      cachedFingerprint &&
      isLibraryFileUnchanged(file, cachedFingerprint)
    ) {
      return finish("cached", cached);
    }

    const fileName = basenameFromRelativePath(p.relativePath);
    const fallbackTitle = stripAudioExtension(fileName, enabledExtensions);
    const albumFolder = folderAlbumFallback(p.relativePath, p.rootDisplayName);
    const tags = await extractTagsFromAudioFile(file);
    const track: Track = {
      id: trackId,
      title: tags?.title ? tags.title : fallbackTitle,
      artist: tags?.artist ? tags.artist : "Unknown artist",
      album: tags?.album ? tags.album : albumFolder,
      durationSec:
        tags?.durationSec && tags.durationSec > 0 ? tags.durationSec : 0,
      audioUrl: null,
      library: { rootId: p.rootId, relativePath: p.relativePath },
    };
    return finish("parsed", attachLibraryFileFingerprint(track, file));
  } catch {
    return finish("error", fallbackTrack(p, enabledExtensions));
  }
}

export type MetadataScanProgress = {
  filesDone: number;
  filesTotal: number;
  filesSkipped: number;
};

export type DirectoryScanProgress =
  | { phase: "walk" }
  | {
      phase: "metadata";
      filesDone: number;
      filesTotal: number;
      filesSkipped: number;
    };

/**
 * Opens files in bounded parallel, parses tags, and returns `Track` rows sorted by path.
 */
export async function buildTracksFromPending(
  pending: readonly PendingAudioFile[],
  enabledExtensions: ReadonlySet<string>,
  scanCache: Map<string, Track>,
  logScanTiming: boolean,
  onProgress?: (progress: MetadataScanProgress) => void,
): Promise<Track[]> {
  if (pending.length === 0) return [];
  const tracks: Track[] = new Array(pending.length);
  let nextIndex = 0;
  let filesDone = 0;
  let filesSkipped = 0;
  const filesTotal = pending.length;

  const report = (): void => {
    onProgress?.({ filesDone, filesTotal, filesSkipped });
  };

  report();

  const worker = async (): Promise<void> => {
    for (;;) {
      const i = nextIndex++;
      if (i >= pending.length) break;
      const pendingFile = pending[i] as PendingAudioFile;
      const trackId = `lib:${pendingFile.rootId}:${pendingFile.relativePath}`;
      const hadCache = scanCache.has(trackId);
      tracks[i] = await pendingFileToTrack(
        pendingFile,
        enabledExtensions,
        scanCache,
        logScanTiming,
      );
      if (hadCache && tracks[i] === scanCache.get(trackId)) {
        filesSkipped += 1;
      }
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
  options: ScanTreeOptions,
  existingTracks: readonly Track[],
  logScanTiming: boolean,
  onProgress?: (progress: DirectoryScanProgress) => void,
): Promise<Track[]> {
  onProgress?.({ phase: "walk" });
  const pending: PendingAudioFile[] = [];
  await collectPendingAudioFiles(
    rootId,
    rootDisplayName,
    dir,
    "",
    0,
    options,
    new Set<string>(),
    pending,
  );

  const scanCache = buildLibraryTrackScanCache(
    existingTracks.filter((t) => t.library?.rootId === rootId),
  );

  onProgress?.({
    phase: "metadata",
    filesDone: 0,
    filesTotal: pending.length,
    filesSkipped: 0,
  });
  if (logScanTiming && pending.length > 0) {
    console.info(
      `[muzical scan] ${rootDisplayName}: reading metadata for ${pending.length} file${pending.length === 1 ? "" : "s"}…`,
    );
  }

  return buildTracksFromPending(
    pending,
    options.enabledExtensions,
    scanCache,
    logScanTiming,
    (metadata) => {
      onProgress?.({ phase: "metadata", ...metadata });
    },
  );
}
