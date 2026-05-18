'use client'

import TrackRowOverflowMenu from '@/components/TrackRowOverflowMenu'
import { formatDuration } from '@/lib/format-duration'
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
        items={[
          {
            id: 'save',
            label: props.alreadySaved ? 'In library' : 'Add to library',
            disabled: props.alreadySaved,
            onSelect: () => props.onSave(props.track),
          },
        ]}
      />
      <button
        type="button"
        onClick={() => props.onQueue(props.track)}
        className="shrink-0 cursor-pointer rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-500/25 transition hover:bg-amber-500/25 dark:text-amber-300 dark:ring-amber-500/40"
      >
        Add
      </button>
    </div>
  )
}
