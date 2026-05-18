import { formatDuration } from "@/lib/format-duration";

/**
 * Formats total library playtime for settings summary (hours when long).
 */
export default function formatTotalLibraryDuration(totalSec: number): string {
  if (totalSec <= 0) return "—";
  const hours = Math.floor(totalSec / 3600);
  if (hours > 0) {
    const minutes = Math.floor((totalSec % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
  return formatDuration(totalSec);
}
