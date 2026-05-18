import type { YoutubeSearchVideo } from '@/lib/youtube/types/youtube-search-video'
import unescapeJsonString from '@/lib/youtube/unescape-json-string'
import waitYoutubeScrapeRateLimit from '@/lib/youtube/wait-youtube-scrape-rate-limit'
import { YOUTUBE_SEARCH_MAX_RESULTS } from '@/lib/youtube/youtube-search-constants'

const VIDEO_ID_PATTERN = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
const TITLE_RUNS_PATTERN = /"title":\{"runs":\[\{"text":"((?:\\.|[^"\\])*)"\}/;
const TITLE_SIMPLE_PATTERN = /"title":\{"simpleText":"((?:\\.|[^"\\])*)"\}/;
const OWNER_PATTERN = /"ownerText":\{"runs":\[\{"text":"((?:\\.|[^"\\])*)"\}/;
const CHANNEL_PATTERN =
  /"longBylineText":\{"runs":\[\{"text":"((?:\\.|[^"\\])*)"\}/;

function parseVideoRendererChunk(chunk: string): YoutubeSearchVideo | null {
  const idMatch = chunk.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
  const videoId = idMatch?.[1]?.trim();
  if (!videoId) return null;

  const titleMatch =
    chunk.match(TITLE_RUNS_PATTERN) ?? chunk.match(TITLE_SIMPLE_PATTERN);
  const channelMatch =
    chunk.match(OWNER_PATTERN) ?? chunk.match(CHANNEL_PATTERN);
  const title = titleMatch?.[1]
    ? unescapeJsonString(titleMatch[1]).trim()
    : "Unknown title";
  const channelTitle = channelMatch?.[1]
    ? unescapeJsonString(channelMatch[1]).trim()
    : "Unknown channel";

  return {
    videoId,
    title: title || "Unknown title",
    channelTitle: channelTitle || "Unknown channel",
    durationSec: 0,
  };
}

function parseVideoIdsOnly(
  html: string,
  maxResults: number,
): YoutubeSearchVideo[] {
  const out: YoutubeSearchVideo[] = [];
  const seen = new Set<string>();
  for (const match of html.matchAll(VIDEO_ID_PATTERN)) {
    const videoId = match[1]?.trim();
    if (!videoId || seen.has(videoId)) continue;
    seen.add(videoId);
    out.push({
      videoId,
      title: "Unknown title",
      channelTitle: "Unknown channel",
      durationSec: 0,
    });
    if (out.length >= maxResults) break;
  }
  return out;
}

/**
 * Search YouTube by scraping the public results page (server-only).
 */
export default async function scrapeYoutubeSearchVideos(
  query: string,
  maxResults = YOUTUBE_SEARCH_MAX_RESULTS,
): Promise<YoutubeSearchVideo[]> {
  const q = query.trim()
  if (!q) return []

  const limit = Math.min(50, Math.max(1, maxResults))
  await waitYoutubeScrapeRateLimit()
  const url = new URL('https://www.youtube.com/results')
  url.searchParams.set('search_query', q)

  const response = await fetch(url.toString(), {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; MuzicalUI/1.0)",
      "Accept-Language": "en",
    },
    cache: "no-store",
  });
  if (!response.ok) return [];

  const html = await response.text();
  const chunks = html.split('"videoRenderer":');
  if (chunks.length > 1) {
    const out: YoutubeSearchVideo[] = [];
    const seen = new Set<string>();
    for (let i = 1; i < chunks.length; i++) {
      const parsed = parseVideoRendererChunk(chunks[i] ?? "");
      if (!parsed || seen.has(parsed.videoId)) continue;
      seen.add(parsed.videoId);
      out.push(parsed);
      if (out.length >= limit) return out;
    }
    if (out.length > 0) return out;
  }

  return parseVideoIdsOnly(html, limit);
}
