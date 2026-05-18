export type LibraryScanSongTimingOutcome = "cached" | "parsed" | "error";

export type LibraryScanSongTimingEntry = {
  relativePath: string;
  rootDisplayName: string;
  durationMs: number;
  outcome: LibraryScanSongTimingOutcome;
};

/**
 * Log per-file library scan timing to the browser console.
 */
export default function logLibraryScanSongTiming(
  entry: LibraryScanSongTimingEntry,
): void {
  const path = `${entry.rootDisplayName}/${entry.relativePath}`;
  const label =
    entry.outcome === "cached"
      ? "cached"
      : entry.outcome === "parsed"
        ? "parsed"
        : "error";
  console.info(
    `[muzical scan] ${path} — ${entry.durationMs.toFixed(1)} ms (${label})`,
  );
}
