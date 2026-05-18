/**
 * Extract a user-facing error message from a Last.fm JSON error body.
 */
export default function lastfmErrorMessageFromBody(
  body: unknown,
): string | null {
  if (!body || typeof body !== "object") return null;
  const record = body as { message?: string; error?: number };
  const message = record.message?.trim();
  if (message) return message;
  if (typeof record.error === "number" && record.error > 0) {
    return `Last.fm error ${record.error}`;
  }
  return null;
}
