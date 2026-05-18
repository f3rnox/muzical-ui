import type { LastfmSimilarTrack } from "@/types/lastfm-similar-track";
import type { Track } from "@/types/track";

/**
 * Map a Last.fm similar track to an app `Track` for queue and library save.
 */
export default function lastfmSimilarTrackToAppTrack(
  item: LastfmSimilarTrack,
): Track {
  const title = item.name.trim() || "Unknown title";
  const artist = item.artistName.trim() || "Unknown artist";
  const mbid = item.mbid?.trim();
  const id =
    mbid && mbid.length > 0
      ? `musicbrainz:${mbid}`
      : `lastfm:${encodeURIComponent(artist)}\u0000${encodeURIComponent(title)}`;

  return {
    id,
    title,
    artist,
    album: "Unknown album",
    durationSec: item.durationSec ?? 0,
    youtubeQuery: `${title} ${artist}`.trim(),
    source: mbid ? "musicbrainz" : undefined,
  };
}
