import type { Track } from "@/types/track";

export type AlbumMetadataFields = {
  artist: string;
  album: string;
};

/**
 * Applies edited artist and album to a track; keeps title; refreshes YouTube query when present.
 */
export default function applyAlbumMetadataPatch(
  track: Track,
  fields: AlbumMetadataFields,
): Track {
  const artist = fields.artist.trim() || track.artist;
  const album = fields.album.trim() || track.album;
  const next: Track = { ...track, artist, album };
  if (track.youtubeQuery?.trim()) {
    next.youtubeQuery = `${track.title} ${artist}`.trim();
    next.youtubeVideoId = undefined;
  }
  return next;
}
