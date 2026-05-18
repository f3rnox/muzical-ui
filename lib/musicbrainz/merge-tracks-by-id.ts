import type { Track } from "@/types/track";

/**
 * Append tracks without duplicate ids.
 */
export function mergeTracksById(
  target: Track[],
  incoming: readonly Track[],
): void {
  const seen = new Set(target.map((t) => t.id));
  for (const t of incoming) {
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    target.push(t);
  }
}
