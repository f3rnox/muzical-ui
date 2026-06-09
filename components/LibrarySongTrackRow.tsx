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
  // Multi-select support
  selected?: boolean
  showCheckbox?: boolean
  onToggleSelect?: (track: Track, event: React.MouseEvent) => void
}

/**
 * Library song row with favorites, details menu, and add-to-queue.
 */
export default function LibrarySongTrackRow(props: LibrarySongTrackRowProps) {
  const {
    openTrackDetails,
    openRelatedSongs,
    openAddToPlaylist,
    downloadTrack,
    removeFromLibrary,
    isFavoriteSong,
    toggleFavoriteTrack,
  } = useLibrary()
  const rowPadSmClass = props.compact ? 'px-1.5 py-1.5' : 'px-2 py-2'
  const rowGapSmClass = props.compact ? 'gap-1.5' : 'gap-2'
  const showCheckbox = props.showCheckbox ?? false
  const isSelected = props.selected ?? false

  const handleRowClick = (e: React.MouseEvent) => {
    if (props.onToggleSelect) {
      if (showCheckbox || e.ctrlKey || e.metaKey || e.shiftKey) {
        e.preventDefault()
        props.onToggleSelect(props.track, e)
        return
      }
    }
  }

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (props.onToggleSelect) {
      props.onToggleSelect(props.track, e)
    }
  }

  return (
    <div
      className={[
        `flex items-center ${rowGapSmClass} rounded-lg ${rowPadSmClass}`,
        props.indentClass ?? '',
        isSelected ? 'bg-accent-500/10 dark:bg-accent-500/15' : '',
        'hover:bg-zinc-100 dark:hover:bg-zinc-800/80',
      ].join(' ')}
      onClick={handleRowClick}
    >
      {showCheckbox ? (
        <button
          type="button"
          aria-checked={isSelected}
          onClick={handleCheckboxClick}
          className={[
            'shrink-0 flex h-4 w-4 items-center justify-center rounded border transition',
            isSelected
              ? 'border-accent-500 bg-accent-500 text-white'
              : 'border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-900',
          ].join(' ')}
          title={isSelected ? 'Deselect' : 'Select'}
        >
          {isSelected ? (
            <svg viewBox="0 0 16 16" className="h-3 w-3" fill="currentColor" aria-hidden>
              <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.5 7.5a.75.75 0 0 1-1.06 0l-3-3a.75.75 0 0 1 1.06-1.06l2.47 2.47 6.97-6.97a.75.75 0 0 1 1.06 0z" />
            </svg>
          ) : null}
        </button>
      ) : null}
      <div className="min-w-0 flex-1" onClick={handleRowClick}>
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
          onAddToPlaylist: (track) => openAddToPlaylist(track, track.title),
          onDownload: downloadTrack,
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
        onClick={(e) => {
          e.stopPropagation()
          props.onAdd(props.track)
        }}
        className="shrink-0 cursor-pointer rounded-full bg-accent-500/15 px-2.5 py-1 text-xs font-medium text-accent-800 ring-1 ring-accent-500/25 transition hover:bg-accent-500/25 dark:text-accent-300 dark:ring-accent-500/40"
      >
        Add
      </button>
    </div>
  )
}
