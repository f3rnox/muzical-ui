import type { Track } from '@/types/track'

export type ArtistMetadataFields = {
  artist: string
}

/**
 * Applies an edited artist name to a track; keeps title and album; refreshes YouTube query when present.
 */
export default function applyArtistMetadataPatch(
  track: Track,
  fields: ArtistMetadataFields,
): Track {
  const artist = fields.artist.trim() || track.artist
  const next: Track = { ...track, artist }
  if (track.youtubeQuery?.trim()) {
    next.youtubeQuery = `${track.title} ${artist}`.trim()
    next.youtubeVideoId = undefined
  }
  return next
}
