import type { Track } from "@/types/track";

export type TrackMetadataFields = {
  title: string;
  artist: string;
  album: string;
};

/**
 * Applies edited title, artist, and album to a track; refreshes YouTube query when present.
 */
export default function applyTrackMetadataPatch(
  track: Track,
  fields: TrackMetadataFields,
): Track {
  const title = fields.title.trim() || track.title;
  const artist = fields.artist.trim() || track.artist;
  const album = fields.album.trim() || track.album;
  const next: Track = { ...track, title, artist, album };
  if (track.youtubeQuery?.trim()) {
    next.youtubeQuery = `${title} ${artist}`.trim();
    next.youtubeVideoId = undefined;
  }
  return next;
}
