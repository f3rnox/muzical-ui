import type { LibraryTrackRef } from '@/types/track'
import type { Track } from '@/types/track'

function parseLibraryRef(value: unknown): LibraryTrackRef | undefined {
  if (!value || typeof value !== 'object') return undefined
  const o = value as Record<string, unknown>
  if (typeof o.rootId !== 'string' || typeof o.relativePath !== 'string') return undefined
  return { rootId: o.rootId, relativePath: o.relativePath }
}

/**
 * Validates a track object loaded from a persisted playback snapshot.
 */
export default function parsePersistedTrack(value: unknown): Track | null {
  if (!value || typeof value !== 'object') return null
  const o = value as Record<string, unknown>
  if (typeof o.id !== 'string' || !o.id.trim()) return null
  if (typeof o.title !== 'string') return null
  if (typeof o.artist !== 'string') return null
  if (typeof o.album !== 'string') return null
  const durationSec =
    typeof o.durationSec === 'number' && Number.isFinite(o.durationSec) && o.durationSec >= 0
      ? o.durationSec
      : 0
  const source =
    o.source === 'library' || o.source === 'musicbrainz' || o.source === 'youtube'
      ? o.source
      : undefined
  const audioUrl = typeof o.audioUrl === 'string' ? o.audioUrl : o.audioUrl === null ? null : undefined
  const youtubeQuery = typeof o.youtubeQuery === 'string' ? o.youtubeQuery : undefined
  const youtubeVideoId = typeof o.youtubeVideoId === 'string' ? o.youtubeVideoId : undefined
  const library = parseLibraryRef(o.library)
  return {
    id: o.id.trim(),
    title: o.title,
    artist: o.artist,
    album: o.album,
    durationSec,
    audioUrl,
    youtubeQuery,
    youtubeVideoId,
    source,
    library,
  }
}
