import type { YoutubeSearchVideo } from "@/lib/youtube/types/youtube-search-video";
import type { Track } from "@/types/track";

/**
 * Map a YouTube search result to an app track for queue/library playback.
 */
export default function youtubeSearchVideoToTrack(
  video: YoutubeSearchVideo,
  searchQuery: string,
): Track {
  const query = searchQuery.trim();
  const title = video.title.trim() || "Unknown title";
  const artist = video.channelTitle.trim() || "Unknown channel";

  return {
    id: `youtube:${video.videoId}`,
    title,
    artist,
    album: "YouTube",
    durationSec: video.durationSec > 0 ? video.durationSec : 0,
    source: "youtube",
    youtubeQuery: query || `${title} ${artist}`.trim(),
    youtubeVideoId: video.videoId,
  };
}
