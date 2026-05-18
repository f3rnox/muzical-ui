/**
 * Resolve a YouTube video id via the app’s server scrape fallback.
 */
export default async function fetchYoutubeVideoIdFromResolveApi(
  query: string,
  signal?: AbortSignal,
): Promise<string | null> {
  const q = query.trim();
  if (!q) return null;

  const url = new URL("/api/youtube/resolve", window.location.origin);
  url.searchParams.set("q", q);

  const response = await fetch(url.toString(), { signal });
  if (!response.ok) return null;

  const body = (await response.json()) as { videoId?: string | null };
  const id = body.videoId?.trim();
  return id || null;
}
