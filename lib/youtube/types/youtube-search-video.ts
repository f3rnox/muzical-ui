/**
 * One YouTube video from a Data API search.
 */
export type YoutubeSearchVideo = {
  videoId: string;
  title: string;
  channelTitle: string;
  durationSec: number;
};
