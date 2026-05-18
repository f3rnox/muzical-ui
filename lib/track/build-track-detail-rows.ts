import { formatDuration } from '@/lib/format-duration'
import formatFileSize from '@/lib/format-file-size'
import describeTrackSource from '@/lib/track/describe-track-source'
import type { TrackDetailRow } from '@/lib/track/track-detail-row'
import type { LibraryRootMeta } from '@/types/library-root-meta'
import type { Track } from '@/types/track'

function pushRow(
  rows: TrackDetailRow[],
  label: string,
  value: string | null | undefined,
  mono = false,
): void {
  const trimmed = value?.trim()
  if (!trimmed) return
  rows.push({ label, value: trimmed, mono })
}

/**
 * Build static detail rows from a track (no file I/O).
 */
export default function buildTrackDetailRows(
  track: Track,
  roots: readonly LibraryRootMeta[],
): TrackDetailRow[] {
  const rows: TrackDetailRow[] = []
  pushRow(rows, 'Title', track.title)
  pushRow(rows, 'Artist', track.artist)
  pushRow(rows, 'Album', track.album)
  if (track.durationSec > 0) {
    rows.push({ label: 'Duration', value: formatDuration(track.durationSec) })
  }
  pushRow(rows, 'Source', describeTrackSource(track))
  pushRow(rows, 'Track ID', track.id, true)

  if (track.library) {
    const rootName = roots.find((r) => r.id === track.library?.rootId)?.name
    pushRow(rows, 'Library folder', rootName ?? track.library.rootId)
    pushRow(rows, 'Relative path', track.library.relativePath, true)
    if (
      typeof track.library.fileSize === 'number' &&
      Number.isFinite(track.library.fileSize)
    ) {
      rows.push({
        label: 'File size (at scan)',
        value: formatFileSize(track.library.fileSize),
      })
    }
    if (
      typeof track.library.fileLastModified === 'number' &&
      Number.isFinite(track.library.fileLastModified)
    ) {
      rows.push({
        label: 'Modified (at scan)',
        value: new Date(track.library.fileLastModified).toLocaleString(),
      })
    }
  }

  pushRow(rows, 'YouTube query', track.youtubeQuery, true)
  pushRow(rows, 'YouTube video ID', track.youtubeVideoId, true)

  return rows
}
