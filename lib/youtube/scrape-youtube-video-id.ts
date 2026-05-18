import {
  readCachedYoutubeVideoId,
  writeCachedYoutubeVideoId,
} from "@/lib/youtube/youtube-video-id-cache";

const VIDEO_ID_PATTERN = /"videoId":"([a-zA-Z0-9_-]{11})"/g;

/**
 * Resolve a YouTube video id by scraping the public search results page (server-only).
 */
export default async function scrapeYoutubeVideoId(
  query: string,
): Promise<string | null> {
  const q = query.trim();
  if (!q) return null;

  const cached = readCachedYoutubeVideoId(q);
  if (cached) return cached;

  const url = new URL("https://www.youtube.com/results");
  url.searchParams.set("search_query", q);

  const response = await fetch(url.toString(), {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; MuzicalUI/1.0)",
      "Accept-Language": "en",
    },
    cache: "no-store",
  });
  if (!response.ok) return null;

  const html = await response.text();
  const seen = new Set<string>();
  for (const match of html.matchAll(VIDEO_ID_PATTERN)) {
    const id = match[1]?.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    writeCachedYoutubeVideoId(q, id);
    return id;
  }

  return null;
}
