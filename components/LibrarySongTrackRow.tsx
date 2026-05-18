'use client'

import { useLibrary } from '@/components/LibraryProvider'
import FavoriteStarButton from '@/components/FavoriteStarButton'
import TrackRowOverflowMenu from '@/components/TrackRowOverflowMenu'
import { formatDuration } from '@/lib/format-duration'
import buildTrackOverflowMenuItems from '@/lib/track/build-track-overflow-menu-items'
import type { Track } from '@/types/track'

type LibrarySongTrackRowProps = {
  track: Track
  compact: boolean
  onAdd: (track: Track) => void
  showArtist?: boolean
  indentClass?: string
}

/**
 * Library song row with favorites, details menu, and add-to-queue.
 */
export default function LibrarySongTrackRow(props: LibrarySongTrackRowProps) {
  const { openTrackDetails, openRelatedSongs, removeFromLibrary, isFavoriteSong, toggleFavoriteTrack } =
    useLibrary()
  const rowPadSmClass = props.compact ? 'px-1.5 py-1.5' : 'px-2 py-2'
  const rowGapSmClass = props.compact ? 'gap-1.5' : 'gap-2'

  return (
    <div
      className={[
        `flex items-center ${rowGapSmClass} rounded-lg ${rowPadSmClass}`,
        props.indentClass ?? '',
        'hover:bg-zinc-100 dark:hover:bg-zinc-800/80',
      ].join(' ')}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{props.track.title}</p>
        {props.showArtist !== false ? (
          <p className="truncate text-xs text-zinc-500">{props.track.artist}</p>
        ) : null}
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
          onRemoveFromLibrary: () => removeFromLibrary(props.track),
        })}
      />
      <FavoriteStarButton
        filled={isFavoriteSong(props.track.id)}
        onPress={() => toggleFavoriteTrack(props.track)}
        label={
          isFavoriteSong(props.track.id)
            ? 'Remove song from favorites'
            : 'Add song to favorites'
        }
      />
      <button
        type="button"
        onClick={() => props.onAdd(props.track)}
        className="shrink-0 cursor-pointer rounded-full bg-accent-500/15 px-2.5 py-1 text-xs font-medium text-accent-800 ring-1 ring-accent-500/25 transition hover:bg-accent-500/25 dark:text-accent-300 dark:ring-accent-500/40"
      >
        Add
      </button>
    </div>
  )
}
