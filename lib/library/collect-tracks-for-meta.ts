import type { LibraryRootMeta } from "@/types/library-root-meta";
import type { ScanProgressTick } from "@/lib/library/scan-progress-tick";
import { scanDirectoryForTracks } from "@/lib/library/scan-tree";
import type { ScanTreeOptions } from "@/types/scan-tree-options";
import type { Track } from "@/types/track";

export type CollectTracksResult = {
  tracks: Track[];
  failedRootCount: number;
  firstError: string | null;
};

function scanFailureMessage(e: unknown): string {
  if (e instanceof DOMException) {
    return `${e.name}: ${e.message}`;
  }
  if (e instanceof Error) {
    return e.message;
  }
  return String(e);
}

/**
 * Scans every configured library root and merges track rows in stable order.
 */
export async function collectTracksForMeta(
  meta: readonly LibraryRootMeta[],
  handles: ReadonlyMap<string, FileSystemDirectoryHandle>,
  scanOptions: ScanTreeOptions,
  existingTracks: readonly Track[],
  logScanTiming: boolean,
  onProgress?: (tick: ScanProgressTick) => void,
): Promise<CollectTracksResult> {
  const list: Track[] = [];
  let failedRootCount = 0;
  let firstError: string | null = null;
  const roots = meta.filter((r) => handles.has(r.id));
  const rootCount = roots.length;
  const scanStartedAt = logScanTiming ? performance.now() : 0;

  if (logScanTiming && rootCount > 0) {
    console.info(
      `[muzical scan] Starting scan of ${rootCount} root${rootCount === 1 ? "" : "s"}…`,
    );
  }

  for (let rootIndex = 0; rootIndex < roots.length; rootIndex++) {
    const r = roots[rootIndex];
    const h = handles.get(r.id);
    if (!h) continue;
    const emit = (
      partial: Pick<
        ScanProgressTick,
        "phase" | "filesDone" | "filesTotal" | "filesSkipped"
      >,
    ): void => {
      onProgress?.({
        rootIndex,
        rootCount,
        rootName: r.name,
        phase: partial.phase,
        filesDone: partial.filesDone,
        filesTotal: partial.filesTotal,
        filesSkipped: partial.filesSkipped,
      });
    };
    emit({ phase: "walk" });
    try {
      const chunk = await scanDirectoryForTracks(
        r.id,
        r.name,
        h,
        scanOptions,
        existingTracks,
        logScanTiming,
        (inner) => {
          if (inner.phase === "walk") {
            emit({ phase: "walk" });
          } else {
            emit({
              phase: "metadata",
              filesDone: inner.filesDone,
              filesTotal: inner.filesTotal,
              filesSkipped: inner.filesSkipped,
            });
          }
        },
      );
      list.push(...chunk);
    } catch (e) {
      failedRootCount += 1;
      if (!firstError) firstError = scanFailureMessage(e);
    }
  }

  list.sort((a, b) => {
    const ra = a.library?.rootId ?? "";
    const rb = b.library?.rootId ?? "";
    const c = ra.localeCompare(rb, undefined, { sensitivity: "base" });
    if (c !== 0) return c;
    const pa = a.library?.relativePath ?? a.title;
    const pb = b.library?.relativePath ?? b.title;
    return pa.localeCompare(pb, undefined, { sensitivity: "base" });
  });

  if (logScanTiming) {
    const elapsedMs = performance.now() - scanStartedAt;
    console.info(
      `[muzical scan] Finished: ${list.length} track${list.length === 1 ? "" : "s"} in ${elapsedMs.toFixed(0)} ms`,
    );
  }

  return { tracks: list, failedRootCount, firstError };
}
