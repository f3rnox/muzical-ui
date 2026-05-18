import type { YoutubeSearchVideo } from "@/lib/youtube/types/youtube-search-video";

/**
 * Search YouTube via the app’s server scrape fallback.
 */
export default async function fetchYoutubeSearchFromScrapeApi(
  query: string,
  signal?: AbortSignal,
  maxResults = 20,
): Promise<YoutubeSearchVideo[]> {
  const q = query.trim();
  if (!q) return [];

  const url = new URL("/api/youtube/search", window.location.origin);
  url.searchParams.set("q", q);
  url.searchParams.set(
    "maxResults",
    String(Math.min(50, Math.max(1, maxResults))),
  );

  const response = await fetch(url.toString(), { signal });
  if (!response.ok) return [];

  const body = (await response.json()) as { videos?: YoutubeSearchVideo[] };
  if (!Array.isArray(body.videos)) return [];
  return body.videos.filter(
    (v) => typeof v.videoId === "string" && v.videoId.trim().length > 0,
  );
}
