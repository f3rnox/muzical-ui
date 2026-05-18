/** One similar track from Last.fm `track.getSimilar`. */
export type LastfmSimilarTrack = {
  name: string;
  artistName: string;
  mbid?: string;
  match?: number;
  url?: string;
  durationSec?: number;
};
