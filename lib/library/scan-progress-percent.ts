import type { ScanProgressTick } from "@/lib/library/scan-progress-tick";

/**
 * Maps scan phase + per-root position to an overall 0–100 percentage.
 */
export function scanProgressPercent(tick: ScanProgressTick): number {
  if (tick.rootCount <= 0) return 0;
  const perRoot = 100 / tick.rootCount;
  let value = tick.rootIndex * perRoot;
  if (tick.phase === "walk") {
    value += perRoot * 0.12;
  } else {
    const total = tick.filesTotal ?? 0;
    const done = tick.filesDone ?? 0;
    const metaRatio = total > 0 ? Math.min(1, done / total) : 0;
    value += perRoot * (0.12 + 0.88 * metaRatio);
  }
  return Math.min(100, Math.round(value));
}
