'use client'

import FavoriteStarButton from '@/components/FavoriteStarButton'
import TrackRowOverflowMenu from '@/components/TrackRowOverflowMenu'
import { formatDuration } from '@/lib/format-duration'
import isMusicBrainzStreamTrack from '@/lib/library/is-musicbrainz-stream-track'
import buildTrackOverflowMenuItems from '@/lib/track/build-track-overflow-menu-items'
import type { QueuedTrack } from '@/types/queue'
import type { Track } from '@/types/track'

export type QueueTrackListProps = {
  queue: readonly QueuedTrack[]
  activeIndex: number
  activeQueueId: string | null
  compactLists: boolean
  libraryTracks: readonly Track[]
  dragOverQueueId: string | null
  draggingQueueId: string | null
  onDragOverQueueIdChange: (queueId: string | null) => void
  onDraggingQueueIdChange: (queueId: string | null) => void
  onSelectIndex: (index: number) => void
  onReorderQueueItems: (fromIndex: number, toIndex: number) => void
  onRemoveQueueItem: (queueId: string, index: number) => void
  isFavoriteSong: (trackId: string) => boolean
  onToggleFavoriteTrack: (track: Track) => void
  onViewTrackDetails: (track: Track) => void
  onViewRelatedSongs: (track: Track) => void
  onAddTrackToPlaylist: (track: Track, label: string) => void
  onDownloadTrack: (track: Track) => void
  onAddTrackToLibrary: (track: Track) => void
  onRemoveTrackFromLibrary: (track: Track) => void
  // Multi-select in queue
  selectedQueueIds?: ReadonlySet<string>
  showQueueCheckboxes?: boolean
  onToggleQueueSelect?: (queueId: string, event?: React.MouseEvent) => void
}

export default function QueueTrackList({
  queue,
  activeIndex,
  activeQueueId,
  compactLists,
  libraryTracks,
  dragOverQueueId,
  draggingQueueId,
  onDragOverQueueIdChange,
  onDraggingQueueIdChange,
  onSelectIndex,
  onReorderQueueItems,
  onRemoveQueueItem,
  isFavoriteSong,
  onToggleFavoriteTrack,
  onViewTrackDetails,
  onViewRelatedSongs,
  onAddTrackToPlaylist,
  onDownloadTrack,
  onAddTrackToLibrary,
  onRemoveTrackFromLibrary,
  selectedQueueIds,
  showQueueCheckboxes,
  onToggleQueueSelect,
}: QueueTrackListProps) {
  const queueRowGapClass = compactLists ? 'gap-2' : 'gap-3'
  const queueRowPadClass = compactLists ? 'px-3 py-2' : 'px-4 py-2.5'
  const queueRemoveButtonPadClass = compactLists ? 'px-1.5 py-1.5' : 'px-2 py-2'

  return (
    <ul
      className="divide-y divide-zinc-200 dark:divide-zinc-800"
      role="listbox"
      aria-label="Track queue"
    >
      {queue.map((row, index) => {
        const track = row.track
        const selected = index === activeIndex
        const isDropTarget =
          dragOverQueueId === row.queueId && draggingQueueId !== row.queueId
        const isStreamTrack = isMusicBrainzStreamTrack(track)
        const isSavedInLibrary = libraryTracks.some((t) => t.id === track.id)

        const qSelected = selectedQueueIds?.has(row.queueId) ?? false
        const showQCheck = showQueueCheckboxes ?? false

        return (
          <li
            key={row.queueId}
            data-queue-id={row.queueId}
            className={[
              'group/row flex items-center gap-0',
              selected ? 'bg-accent-50/90 dark:bg-white/6' : '',
              qSelected ? 'bg-accent-500/10 dark:bg-accent-500/15' : '',
              isDropTarget ? 'ring-1 ring-accent-400/30' : '',
            ].join(' ')}
            onDragOver={(e) => {
              if (!draggingQueueId) return
              e.preventDefault()
              if (dragOverQueueId !== row.queueId) onDragOverQueueIdChange(row.queueId)
            }}
            onDrop={(e) => {
              e.preventDefault()
              const fromQueueId = draggingQueueId
              onDraggingQueueIdChange(null)
              onDragOverQueueIdChange(null)
              if (!fromQueueId) return
              if (fromQueueId === row.queueId) return
              const fromIndex = queue.findIndex((q) => q.queueId === fromQueueId)
              if (fromIndex < 0) return

              const rect = (e.currentTarget as HTMLLIElement).getBoundingClientRect()
              const insertAfter = e.clientY > rect.top + rect.height / 2
              const desiredInsertIndex = insertAfter ? index + 1 : index
              const adjustedToIndex =
                fromIndex < desiredInsertIndex ? desiredInsertIndex - 1 : desiredInsertIndex
              onReorderQueueItems(fromIndex, adjustedToIndex)
            }}
          >
            <button
              type="button"
              role="option"
              aria-selected={selected}
              onClick={(e) => {
                const isDouble = e.detail === 2
                if (onToggleQueueSelect && (showQCheck || e.ctrlKey || e.metaKey || e.shiftKey || isDouble)) {
                  e.preventDefault()
                  onToggleQueueSelect(row.queueId, isDouble ? undefined : e)
                  return
                }
                onSelectIndex(index)
              }}
              draggable
              onDragStart={(e) => {
                onDraggingQueueIdChange(row.queueId)
                onDragOverQueueIdChange(row.queueId)
                e.dataTransfer.effectAllowed = 'move'
                e.dataTransfer.setData('text/plain', row.queueId)
              }}
              onDragEnd={() => {
                onDraggingQueueIdChange(null)
                onDragOverQueueIdChange(null)
              }}
              className={[
                `flex min-w-0 flex-1 items-center ${queueRowGapClass} border-l-2 border-transparent ${queueRowPadClass} text-left transition-colors`,
                selected
                  ? 'border-accent-500 dark:border-accent-400'
                  : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/60',
                'cursor-grab active:cursor-grabbing',
                isDropTarget ? 'border-accent-500/20 dark:border-accent-400/20' : '',
              ].join(' ')}
            >
              {showQCheck ? (
                <span
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleQueueSelect?.(row.queueId, e)
                  }}
                  className={[
                    'mr-2 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                    qSelected
                      ? 'border-accent-500 bg-accent-500 text-white'
                      : 'border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-900',
                  ].join(' ')}
                  aria-hidden
                >
                  {qSelected ? (
                    <svg viewBox="0 0 16 16" className="h-3 w-3" fill="currentColor">
                      <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.5 7.5a.75.75 0 0 1-1.06 0l-3-3a.75.75 0 0 1 1.06-1.06l2.47 2.47 6.97-6.97a.75.75 0 0 1 1.06 0z" />
                    </svg>
                  ) : null}
                </span>
              ) : null}
              <span className="w-5 shrink-0 text-right text-[11px] tabular-nums text-zinc-400 dark:text-zinc-500">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium leading-snug text-zinc-900 dark:text-zinc-100">
                  {track.title}
                </p>
                <p className="truncate text-xs leading-snug text-zinc-500 dark:text-zinc-400">
                  {track.artist} · {track.album}
                </p>
              </div>
              <span className="shrink-0 text-[11px] tabular-nums text-zinc-400 dark:text-zinc-500">
                {track.durationSec > 0 ? formatDuration(track.durationSec) : '—'}
              </span>
            </button>
            <div
              className={[
                'flex shrink-0 items-center border-l pr-1 pl-0.5',
                selected
                  ? 'border-accent-200/80 dark:border-white/8'
                  : 'border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/40',
              ].join(' ')}
            >
              <FavoriteStarButton
                className="rounded-none"
                filled={isFavoriteSong(track.id)}
                onPress={() => onToggleFavoriteTrack(track)}
                label={
                  isFavoriteSong(track.id)
                    ? 'Remove song from favorites'
                    : 'Add song to favorites'
                }
              />
              <TrackRowOverflowMenu
                triggerLabel={`Actions for ${track.title}`}
                items={buildTrackOverflowMenuItems({
                  track,
                  onViewDetails: onViewTrackDetails,
                  onViewRelatedSongs: onViewRelatedSongs,
                  onAddToPlaylist: (t) => onAddTrackToPlaylist(t, t.title),
                  onDownload: onDownloadTrack,
                  onSave:
                    isStreamTrack && !isSavedInLibrary
                      ? () => onAddTrackToLibrary(track)
                      : undefined,
                  onRemoveFromLibrary: isSavedInLibrary
                    ? () => onRemoveTrackFromLibrary(track)
                    : undefined,
                  onSelect: onToggleQueueSelect
                    ? () => onToggleQueueSelect(row.queueId)
                    : undefined,
                })}
              />
              <button
                type="button"
                aria-label={`Remove ${track.title} from queue`}
                onClick={() => onRemoveQueueItem(row.queueId, index)}
                className={`shrink-0 ${queueRemoveButtonPadClass} text-[11px] text-zinc-500 opacity-80 transition hover:bg-zinc-200/80 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 sm:opacity-0 sm:group-hover/row:opacity-100`}
              >
                <span className="hidden sm:inline">Remove</span>
                <span className="sm:hidden" aria-hidden>×</span>
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}