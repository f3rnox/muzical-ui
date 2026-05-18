'use client'

import { useCallback, useMemo, useState } from 'react'
import LibrarySongTrackRow from '@/components/LibrarySongTrackRow'
import TrackRowOverflowMenu from '@/components/TrackRowOverflowMenu'
import { useLibrary } from '@/components/LibraryProvider'
import resolvePlaylistTracks from '@/lib/playlists/resolve-playlist-tracks'
import sortPlaylistsByUpdated from '@/lib/playlists/sort-playlists-by-updated'
import { formatDuration } from '@/lib/format-duration'

type PlaylistsBrowserPanelProps = {
  compact: boolean
  rowPadLgClass: string
  ulSpaceYClass: string
}

/**
 * "Playlists" tab inside the library panel: list, detail view, create, rename, delete.
 */
export default function PlaylistsBrowserPanel(props: PlaylistsBrowserPanelProps) {
  const {
    playlists,
    libraryTracks,
    addToQueue,
    createPlaylist,
    renamePlaylist,
    deletePlaylist,
    removeTracksFromPlaylist,
  } = useLibrary()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')

  const sorted = useMemo(() => sortPlaylistsByUpdated(playlists), [playlists])

  const selectedPlaylist = useMemo(() => {
    if (!selectedId) return null
    return playlists.find((p) => p.id === selectedId) ?? null
  }, [playlists, selectedId])

  const selectedTracks = useMemo(() => {
    if (!selectedPlaylist) return []
    return resolvePlaylistTracks(selectedPlaylist, libraryTracks)
  }, [selectedPlaylist, libraryTracks])

  const selectedDuration = useMemo(() => {
    let total = 0
    for (const t of selectedTracks) {
      if (t.durationSec > 0) total += t.durationSec
    }
    return total
  }, [selectedTracks])

  const onCreate = useCallback(() => {
    const trimmed = newName.trim()
    if (!trimmed) {
      setCreateError('Enter a name.')
      return
    }
    const created = createPlaylist(trimmed)
    if (!created) {
      setCreateError('Could not create playlist.')
      return
    }
    setNewName('')
    setCreateError(null)
  }, [createPlaylist, newName])

  const onStartRename = useCallback((playlistId: string, name: string) => {
    setRenamingId(playlistId)
    setRenameDraft(name)
  }, [])

  const onCommitRename = useCallback(() => {
    if (!renamingId) return
    const ok = renamePlaylist(renamingId, renameDraft)
    if (ok) {
      setRenamingId(null)
      setRenameDraft('')
    }
  }, [renameDraft, renamePlaylist, renamingId])

  const onCancelRename = useCallback(() => {
    setRenamingId(null)
    setRenameDraft('')
  }, [])

  const onDelete = useCallback(
    (playlistId: string, name: string) => {
      const confirmed =
        typeof window !== 'undefined' &&
        window.confirm(`Delete playlist “${name}”? This cannot be undone.`)
      if (!confirmed) return
      deletePlaylist(playlistId)
      setSelectedId((id) => (id === playlistId ? null : id))
    },
    [deletePlaylist],
  )

  if (selectedPlaylist) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setSelectedId(null)}
          className="mb-2 cursor-pointer px-2 text-xs font-medium text-accent-700 hover:underline dark:text-accent-400"
        >
          ← Playlists
        </button>
        <div className="mb-3 border-b border-zinc-200 px-2 pb-3 dark:border-zinc-800">
          <h3 className="truncate text-lg font-semibold leading-tight text-zinc-900 dark:text-zinc-50">
            {selectedPlaylist.name}
          </h3>
          <p className="mt-1 text-xs text-zinc-500">
            {selectedTracks.length} track{selectedTracks.length === 1 ? '' : 's'}
            {selectedDuration > 0 ? ` · ${formatDuration(selectedDuration)}` : ''}
            {selectedTracks.length < selectedPlaylist.trackIds.length
              ? ` · ${selectedPlaylist.trackIds.length - selectedTracks.length} missing from library`
              : ''}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => addToQueue(selectedTracks)}
              disabled={selectedTracks.length === 0}
              className="cursor-pointer rounded-full bg-accent-500 px-3 py-1 text-xs font-semibold text-zinc-950 transition hover:bg-accent-400 disabled:opacity-40"
            >
              Add all to queue
            </button>
            <button
              type="button"
              onClick={() => onStartRename(selectedPlaylist.id, selectedPlaylist.name)}
              className="cursor-pointer rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            >
              Rename
            </button>
            <button
              type="button"
              onClick={() => onDelete(selectedPlaylist.id, selectedPlaylist.name)}
              className="cursor-pointer rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              Delete
            </button>
          </div>
          {renamingId === selectedPlaylist.id ? (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="text"
                value={renameDraft}
                onChange={(e) => setRenameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    onCommitRename()
                  } else if (e.key === 'Escape') {
                    e.preventDefault()
                    onCancelRename()
                  }
                }}
                autoFocus
                className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-900 outline-none transition focus:border-accent-400 focus:ring-2 focus:ring-accent-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
              <button
                type="button"
                onClick={onCommitRename}
                className="cursor-pointer rounded-lg bg-accent-500 px-3 py-1.5 text-xs font-semibold text-zinc-950 transition hover:bg-accent-400"
              >
                Save
              </button>
              <button
                type="button"
                onClick={onCancelRename}
                className="cursor-pointer rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
            </div>
          ) : null}
        </div>
        {selectedTracks.length === 0 ? (
          <p className="px-2 py-4 text-sm text-zinc-500">
            This playlist has no tracks. Add some from the library using each track&apos;s menu.
          </p>
        ) : (
          <ul className={props.ulSpaceYClass}>
            {selectedTracks.map((t) => (
              <li key={t.id} className="group/row flex items-center gap-1">
                <div className="min-w-0 flex-1">
                  <LibrarySongTrackRow
                    track={t}
                    compact={props.compact}
                    onAdd={(track) => addToQueue(track)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeTracksFromPlaylist(selectedPlaylist.id, [t.id])}
                  className="shrink-0 cursor-pointer rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="px-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                onCreate()
              }
            }}
            placeholder="New playlist name"
            className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-accent-400 focus:ring-2 focus:ring-accent-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-accent-500/60"
            aria-label="New playlist name"
          />
          <button
            type="button"
            onClick={onCreate}
            className="shrink-0 cursor-pointer rounded-lg bg-accent-500 px-3 py-2 text-xs font-semibold text-zinc-950 transition hover:bg-accent-400"
          >
            Create
          </button>
        </div>
        {createError ? (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{createError}</p>
        ) : null}
      </div>

      {sorted.length === 0 ? (
        <p className="px-2 py-4 text-sm text-zinc-500">
          No playlists yet. Create one above, then add tracks via each track&apos;s menu.
        </p>
      ) : (
        <ul className={props.ulSpaceYClass}>
          {sorted.map((playlist) => {
            const tracks = resolvePlaylistTracks(playlist, libraryTracks)
            const isRenaming = renamingId === playlist.id
            return (
              <li key={playlist.id} className="group/row flex items-center gap-1">
                {isRenaming ? (
                  <div className="flex min-w-0 flex-1 items-center gap-2 px-2">
                    <input
                      type="text"
                      value={renameDraft}
                      onChange={(e) => setRenameDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          onCommitRename()
                        } else if (e.key === 'Escape') {
                          e.preventDefault()
                          onCancelRename()
                        }
                      }}
                      autoFocus
                      className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-900 outline-none transition focus:border-accent-400 focus:ring-2 focus:ring-accent-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    />
                    <button
                      type="button"
                      onClick={onCommitRename}
                      className="cursor-pointer rounded-lg bg-accent-500 px-3 py-1.5 text-xs font-semibold text-zinc-950 transition hover:bg-accent-400"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={onCancelRename}
                      className="cursor-pointer rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setSelectedId(playlist.id)}
                      className={`flex min-w-0 flex-1 items-center justify-between rounded-lg ${props.rowPadLgClass} text-left text-sm text-zinc-800 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800/80`}
                    >
                      <span className="min-w-0 flex-1 truncate font-medium text-zinc-900 dark:text-zinc-100">
                        {playlist.name}
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-zinc-500">
                        {playlist.trackIds.length}
                      </span>
                    </button>
                    <TrackRowOverflowMenu
                      triggerLabel={`Actions for ${playlist.name}`}
                      items={[
                        {
                          id: 'rename',
                          label: 'Rename',
                          onSelect: () => onStartRename(playlist.id, playlist.name),
                        },
                        {
                          id: 'delete',
                          label: 'Delete',
                          onSelect: () => onDelete(playlist.id, playlist.name),
                        },
                      ]}
                    />
                    <button
                      type="button"
                      onClick={() => addToQueue(tracks)}
                      disabled={tracks.length === 0}
                      className="shrink-0 self-center rounded-full bg-accent-500/15 px-2.5 py-1 text-xs font-medium text-accent-800 ring-1 ring-accent-500/25 transition hover:bg-accent-500/25 disabled:opacity-40 dark:text-accent-300 dark:ring-accent-500/40"
                    >
                      Add all
                    </button>
                  </>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
