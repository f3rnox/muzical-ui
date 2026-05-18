import type { ScanProgressTick } from "@/lib/library/scan-progress-tick";

/**
 * Human-readable status line for the library scan notification.
 */
export function scanProgressLabel(tick: ScanProgressTick): string {
  const prefix =
    tick.rootCount > 1 ? `[${tick.rootIndex + 1}/${tick.rootCount}] ` : "";
  if (tick.phase === "walk") {
    return `${prefix}Listing files in ${tick.rootName}…`;
  }
  const total = tick.filesTotal ?? 0;
  const done = tick.filesDone ?? 0;
  const skipped = tick.filesSkipped ?? 0;
  if (total > 0) {
    if (skipped > 0) {
      return `${prefix}Reading tags (${done}/${total}, ${skipped} unchanged) · ${tick.rootName}`;
    }
    return `${prefix}Reading tags (${done}/${total}) · ${tick.rootName}`;
  }
  return `${prefix}Reading tags · ${tick.rootName}`;
}
