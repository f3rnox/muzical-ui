export type LastfmTrackQuery = {
  artist: string;
  track: string;
};

/**
 * Normalize artist/title for Last.fm track lookup (strip track numbers, common suffixes).
 */
export default function normalizeLastfmTrackQuery(
  artist: string,
  track: string,
): LastfmTrackQuery {
  const artistTrimmed = artist.trim();
  let trackTrimmed = track.trim();

  trackTrimmed = trackTrimmed.replace(/^\d{1,3}[\s.\-_–—:]+/, "");
  trackTrimmed = trackTrimmed.replace(
    /\s*[\(\[][^\)\]]*(?:remaster|live|version|edit|mix|bonus|deluxe)[^\)\]]*[\)\]]\s*$/i,
    "",
  );
  trackTrimmed = trackTrimmed.trim();

  return {
    artist: artistTrimmed,
    track: trackTrimmed.length > 0 ? trackTrimmed : track.trim(),
  };
}
