'use client'

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useLibrary } from '@/components/LibraryProvider'
import sortPlaylistsByUpdated from '@/lib/playlists/sort-playlists-by-updated'
import type { Track } from '@/types/track'

type AddToPlaylistDialogProps = {
  /** Tracks to append to the selected (or newly created) playlist */
  tracks: readonly Track[]
  /** Short label (e.g. song title or "5 tracks") shown in the header */
  contextLabel: string
  onClose: () => void
}

function summarizeAddResult(addedCount: number, totalCount: number): string {
  if (addedCount === 0) return 'Already in playlist'
  if (addedCount === totalCount) {
    return `Added ${addedCount} track${addedCount === 1 ? '' : 's'}`
  }
  return `Added ${addedCount} new track${addedCount === 1 ? '' : 's'} (${totalCount - addedCount} already present)`
}

/**
 * Pick an existing playlist or create a new one, then append the given tracks.
 */
export default function AddToPlaylistDialog(props: AddToPlaylistDialogProps) {
  const { tracks, contextLabel, onClose } = props
  const { playlists, addTracksToPlaylist, createPlaylist } = useLibrary()
  const titleId = useId()
  const newNameInputId = useId()
  const panelRef = useRef<HTMLDivElement | null>(null)
  const [newName, setNewName] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const sorted = useMemo(() => sortPlaylistsByUpdated(playlists), [playlists])

  const onAddToExisting = useCallback(
    (playlistId: string) => {
      setError(null)
      const added = addTracksToPlaylist(playlistId, tracks)
      setStatus(summarizeAddResult(added, tracks.length))
    },
    [addTracksToPlaylist, tracks],
  )

  const onCreateAndAdd = useCallback(() => {
    setError(null)
    const trimmed = newName.trim()
    if (!trimmed) {
      setError('Enter a playlist name.')
      return
    }
    const ids = tracks.map((t) => t.id)
    const created = createPlaylist(trimmed, ids)
    if (!created) {
      setError('Could not create playlist.')
      return
    }
    setNewName('')
    setStatus(`Created “${created.name}” with ${created.trackIds.length} track${created.trackIds.length === 1 ? '' : 's'}`)
  }, [createPlaylist, newName, tracks])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    panelRef.current?.focus()
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-900/50 p-4 sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="flex max-h-[min(85vh,32rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-950"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <div className="min-w-0">
            <h2 id={titleId} className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Add to playlist
            </h2>
            <p className="truncate text-sm text-zinc-500">{contextLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 cursor-pointer rounded-lg px-2 py-1 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Close
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          <div className="flex flex-col gap-2">
            <label
              htmlFor={newNameInputId}
              className="text-xs font-medium uppercase tracking-wider text-zinc-500"
            >
              Create new playlist
            </label>
            <div className="flex items-center gap-2">
              <input
                id={newNameInputId}
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    onCreateAndAdd()
                  }
                }}
                placeholder="My playlist"
                className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-accent-400 focus:ring-2 focus:ring-accent-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-accent-500/60"
                autoFocus
              />
              <button
                type="button"
                onClick={onCreateAndAdd}
                className="shrink-0 cursor-pointer rounded-lg bg-accent-500 px-3 py-2 text-xs font-semibold text-zinc-950 transition hover:bg-accent-400"
              >
                Create
              </button>
            </div>
            {error ? (
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            ) : null}
            {status ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{status}</p>
            ) : null}
          </div>

          <div className="mt-5">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
              Existing playlists
            </p>
            {sorted.length === 0 ? (
              <p className="px-1 text-xs text-zinc-500">No playlists yet — create one above.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {sorted.map((playlist) => (
                  <li key={playlist.id}>
                    <button
                      type="button"
                      onClick={() => onAddToExisting(playlist.id)}
                      className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-left text-sm transition hover:border-accent-400/60 hover:bg-accent-50/40 dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:bg-accent-950/30"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-zinc-900 dark:text-zinc-100">
                          {playlist.name}
                        </span>
                        <span className="block truncate text-xs text-zinc-500">
                          {playlist.trackIds.length} track{playlist.trackIds.length === 1 ? '' : 's'}
                        </span>
                      </span>
                      <span className="shrink-0 rounded-full bg-accent-500/15 px-2.5 py-1 text-xs font-medium text-accent-800 ring-1 ring-accent-500/25 dark:text-accent-300 dark:ring-accent-500/40">
                        Add
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
