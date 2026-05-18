/**
 * True when Last.fm returned error 6 or a "track not found" message.
 */
export default function isLastfmTrackNotFoundBody(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const record = body as { error?: number; message?: string };
  if (record.error === 6) return true;
  return /track not found/i.test(record.message?.trim() ?? "");
}
