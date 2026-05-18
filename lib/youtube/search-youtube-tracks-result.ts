import type { Track } from "@/types/track";

export type YoutubeSearchSource = "api" | "scrape";

export type YoutubeSearchTracksResult = {
  tracks: Track[];
  source: YoutubeSearchSource;
  nextPageToken?: string;
};
