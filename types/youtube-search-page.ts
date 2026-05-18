import type { YoutubeSearchSource } from "@/lib/youtube/search-youtube-tracks-result";
import type { Track } from "@/types/track";

export type YoutubeSearchPageResult = {
  tracks: Track[];
  source: YoutubeSearchSource;
  nextPageToken?: string;
  hasMore: boolean;
};
