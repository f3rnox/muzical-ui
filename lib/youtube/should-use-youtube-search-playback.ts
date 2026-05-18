/**
 * True when playback should use the iframe search playlist (no resolved video id yet).
 */
export default function shouldUseYoutubeSearchPlayback(
  youtubeQuery: string | undefined,
  youtubeVideoId: string | undefined,
): boolean {
  const query = youtubeQuery?.trim();
  if (!query) return false;
  return !youtubeVideoId?.trim();
}
