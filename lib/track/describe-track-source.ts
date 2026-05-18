import type { Track } from '@/types/track'

/**
 * Human-readable label for where a track came from.
 */
export default function describeTrackSource(track: Track): string {
  if (track.library) return 'Local library file'
  if (track.source === 'youtube' || track.id.startsWith('youtube:')) return 'YouTube'
  if (track.source === 'musicbrainz' || track.id.startsWith('musicbrainz:')) return 'MusicBrainz'
  if (track.youtubeVideoId?.trim()) return 'YouTube'
  if (track.youtubeQuery?.trim()) return 'YouTube (search)'
  if (track.source === 'library') return 'Local library'
  return 'Unknown'
}
