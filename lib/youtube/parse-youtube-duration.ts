/**
 * Parse an ISO 8601 duration from the YouTube Data API (e.g. PT4M13S) to seconds.
 */
export default function parseYoutubeDuration(iso: string): number {
  const trimmed = iso.trim();
  if (!trimmed.startsWith("PT")) return 0;
  const match = trimmed.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return 0;
  const hours = Number.parseInt(match[1] ?? "0", 10);
  const minutes = Number.parseInt(match[2] ?? "0", 10);
  const seconds = Number.parseInt(match[3] ?? "0", 10);
  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    !Number.isFinite(seconds)
  )
    return 0;
  return hours * 3600 + minutes * 60 + seconds;
}
