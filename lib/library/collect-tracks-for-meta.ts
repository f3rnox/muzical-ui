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
  onProgress?: (tick: ScanProgressTick) => void,
): Promise<CollectTracksResult> {
  const list: Track[] = [];
  let failedRootCount = 0;
  let firstError: string | null = null;
  const roots = meta.filter((r) => handles.has(r.id));
  const rootCount = roots.length;

  for (let rootIndex = 0; rootIndex < roots.length; rootIndex++) {
    const r = roots[rootIndex];
    const h = handles.get(r.id);
    if (!h) continue;
    const emit = (
      partial: Pick<ScanProgressTick, "phase" | "filesDone" | "filesTotal">,
    ): void => {
      onProgress?.({
        rootIndex,
        rootCount,
        rootName: r.name,
        phase: partial.phase,
        filesDone: partial.filesDone,
        filesTotal: partial.filesTotal,
      });
    };
    emit({ phase: "walk" });
    try {
      const chunk = await scanDirectoryForTracks(
        r.id,
        r.name,
        h,
        scanOptions,
        (inner) => {
          if (inner.phase === "walk") {
            emit({ phase: "walk" });
          } else {
            emit({
              phase: "metadata",
              filesDone: inner.filesDone,
              filesTotal: inner.filesTotal,
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

  return { tracks: list, failedRootCount, firstError };
}
