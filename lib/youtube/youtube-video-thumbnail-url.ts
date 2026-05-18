export type YoutubeThumbnailQuality = "max" | "hq" | "mq" | "default";

const QUALITY_FILE: Record<YoutubeThumbnailQuality, string> = {
  max: "maxresdefault",
  hq: "hqdefault",
  mq: "mqdefault",
  default: "default",
};

/**
 * Build a YouTube video thumbnail URL for use as track cover art.
 */
export default function youtubeVideoThumbnailUrl(
  videoId: string,
  quality: YoutubeThumbnailQuality = "hq",
): string {
  const id = videoId.trim();
  if (!id) return "";
  const file = QUALITY_FILE[quality];
  return `https://i.ytimg.com/vi/${id}/${file}.jpg`;
}
