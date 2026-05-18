import isYoutubeQuotaErrorMessage from "@/lib/youtube/is-youtube-quota-error-message";
import markYoutubeDataApiBlocked from "@/lib/youtube/mark-youtube-data-api-blocked";
import parseYoutubeDuration from "@/lib/youtube/parse-youtube-duration";
import readYoutubeDataApiBlocked from "@/lib/youtube/read-youtube-data-api-blocked";
import type { YoutubeSearchVideo } from "@/lib/youtube/types/youtube-search-video";
import waitYoutubeDataApiRateLimit from "@/lib/youtube/wait-youtube-data-api-rate-limit";
import { YOUTUBE_SEARCH_PAGE_SIZE } from "@/lib/youtube/youtube-search-constants";

type YoutubeSearchListResponse = {
  items?: Array<{
    id?: { videoId?: string };
    snippet?: {
      title?: string;
      channelTitle?: string;
    };
  }>;
  nextPageToken?: string;
  error?: { message?: string; errors?: Array<{ reason?: string }> };
};

type YoutubeVideosListResponse = {
  items?: Array<{
    id?: string;
    contentDetails?: { duration?: string };
    snippet?: {
      title?: string;
      channelTitle?: string;
    };
  }>;
  error?: { message?: string; errors?: Array<{ reason?: string }> };
};

export type YoutubeSearchVideosResult = {
  videos: YoutubeSearchVideo[];
  nextPageToken?: string;
};

/**
 * Search YouTube for embeddable videos via the Data API v3.
 */
export default async function searchYoutubeVideos(
  query: string,
  apiKey: string,
  signal?: AbortSignal,
  maxResults = YOUTUBE_SEARCH_PAGE_SIZE,
  pageToken?: string,
): Promise<YoutubeSearchVideosResult> {
  const q = query.trim();
  const key = apiKey.trim();
  if (!q || !key) return { videos: [] };
  if (readYoutubeDataApiBlocked()) return { videos: [] };

  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set("type", "video");
  searchUrl.searchParams.set(
    "maxResults",
    String(Math.min(50, Math.max(1, maxResults))),
  );
  searchUrl.searchParams.set("videoEmbeddable", "true");
  searchUrl.searchParams.set("q", q);
  searchUrl.searchParams.set("key", key);
  if (pageToken?.trim())
    searchUrl.searchParams.set("pageToken", pageToken.trim());

  await waitYoutubeDataApiRateLimit();
  const searchResponse = await fetch(searchUrl, { signal });
  const searchBody = (await searchResponse.json()) as YoutubeSearchListResponse;
  if (!searchResponse.ok) {
    const message = searchBody.error?.message?.trim() ?? "";
    const quotaReason =
      searchBody.error?.errors?.some((e) => e.reason === "quotaExceeded") ??
      false;
    if (quotaReason || isYoutubeQuotaErrorMessage(message)) {
      markYoutubeDataApiBlocked();
    }
    throw new Error(message || "YouTube search failed");
  }

  const videoIds: string[] = [];
  const snippetById = new Map<
    string,
    { title: string; channelTitle: string }
  >();
  for (const item of searchBody.items ?? []) {
    const videoId = item.id?.videoId?.trim();
    if (!videoId || snippetById.has(videoId)) continue;
    videoIds.push(videoId);
    snippetById.set(videoId, {
      title: item.snippet?.title?.trim() || "Unknown title",
      channelTitle: item.snippet?.channelTitle?.trim() || "Unknown channel",
    });
  }
  if (videoIds.length === 0) {
    return { videos: [], nextPageToken: searchBody.nextPageToken };
  }

  const detailsUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
  detailsUrl.searchParams.set("part", "contentDetails,snippet");
  detailsUrl.searchParams.set("id", videoIds.join(","));
  detailsUrl.searchParams.set("key", key);

  await waitYoutubeDataApiRateLimit();
  const detailsResponse = await fetch(detailsUrl, { signal });
  const detailsBody =
    (await detailsResponse.json()) as YoutubeVideosListResponse;
  if (!detailsResponse.ok) {
    const message = detailsBody.error?.message?.trim() ?? "";
    const quotaReason =
      detailsBody.error?.errors?.some((e) => e.reason === "quotaExceeded") ??
      false;
    if (quotaReason || isYoutubeQuotaErrorMessage(message)) {
      markYoutubeDataApiBlocked();
    }
    throw new Error(message || "YouTube video lookup failed");
  }

  const out: YoutubeSearchVideo[] = [];
  const order = new Map(videoIds.map((id, index) => [id, index]));
  const sorted = [...(detailsBody.items ?? [])].sort((a, b) => {
    const ai = order.get(a.id ?? "") ?? 0;
    const bi = order.get(b.id ?? "") ?? 0;
    return ai - bi;
  });

  for (const item of sorted) {
    const videoId = item.id?.trim();
    if (!videoId) continue;
    const fallback = snippetById.get(videoId);
    const title =
      item.snippet?.title?.trim() || fallback?.title || "Unknown title";
    const channelTitle =
      item.snippet?.channelTitle?.trim() ||
      fallback?.channelTitle ||
      "Unknown channel";
    const durationSec = parseYoutubeDuration(
      item.contentDetails?.duration ?? "",
    );
    out.push({ videoId, title, channelTitle, durationSec });
  }

  return { videos: out, nextPageToken: searchBody.nextPageToken };
}
