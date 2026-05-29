'use client'

import { useLibrary } from '@/components/LibraryProvider'
import TrackRowOverflowMenu from '@/components/TrackRowOverflowMenu'
import { formatDuration } from '@/lib/format-duration'
import buildTrackOverflowMenuItems from '@/lib/track/build-track-overflow-menu-items'
import type { Track } from '@/types/track'

type MusicBrainzTrackRowProps = {
  track: Track
  alreadySaved: boolean
  compact: boolean
  onQueue: (track: Track) => void
  onSave: (track: Track) => void
  subtitle?: string
}

/**
 * Single MusicBrainz search result row with queue and save actions.
 */
export default function MusicBrainzTrackRow(props: MusicBrainzTrackRowProps) {
  const { openTrackDetails, openRelatedSongs, downloadTrack, removeFromLibrary } = useLibrary()
  const rowPadSmClass = props.compact ? 'px-1.5 py-1.5' : 'px-2 py-2'
  const rowGapSmClass = props.compact ? 'gap-1.5' : 'gap-2'
  const subtitle =
    props.subtitle ?? `${props.track.artist} · ${props.track.album}`

  return (
    <div
      className={`flex items-center ${rowGapSmClass} rounded-lg ${rowPadSmClass} hover:bg-zinc-100 dark:hover:bg-zinc-800/80`}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{props.track.title}</p>
        <p className="truncate text-xs text-zinc-500">{subtitle}</p>
      </div>
      <span className="shrink-0 text-xs tabular-nums text-zinc-500">
        {props.track.durationSec > 0 ? formatDuration(props.track.durationSec) : '—'}
      </span>
      <TrackRowOverflowMenu
        triggerLabel={`Actions for ${props.track.title}`}
        items={buildTrackOverflowMenuItems({
          track: props.track,
          onViewDetails: openTrackDetails,
          onViewRelatedSongs: openRelatedSongs,
          onDownload: downloadTrack,
          onSave: props.alreadySaved ? undefined : () => props.onSave(props.track),
          onRemoveFromLibrary: props.alreadySaved
            ? () => removeFromLibrary(props.track)
            : undefined,
        })}
      />
      <button
        type="button"
        onClick={() => props.onQueue(props.track)}
        className="shrink-0 cursor-pointer rounded-full bg-accent-500/15 px-2.5 py-1 text-xs font-medium text-accent-800 ring-1 ring-accent-500/25 transition hover:bg-accent-500/25 dark:text-accent-300 dark:ring-accent-500/40"
      >
        Add
      </button>
    </div>
  )
}
