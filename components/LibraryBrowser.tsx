'use client'

import { useCallback, useMemo, useState } from 'react'
import { useLibrary } from '@/components/LibraryProvider'
import type { LibraryRootMeta } from '@/components/LibraryProvider'
import type { Track } from '@/types/track'
import AlbumCoverThumb from '@/components/AlbumCoverThumb'
import { formatDuration } from '@/lib/format-duration'

type BrowseMode = 'artist' | 'album' | 'folder'

function filterTracksByQuery(tracks: readonly Track[], query: string): Track[] {
  const s = query.trim().toLowerCase()
  if (!s) return [...tracks]
  return tracks.filter((t) => {
    const rel = t.library?.relativePath ?? ''
    return (
      t.title.toLowerCase().includes(s) ||
      t.artist.toLowerCase().includes(s) ||
      t.album.toLowerCase().includes(s) ||
      rel.toLowerCase().includes(s)
    )
  })
}

function groupByArtist(tracks: readonly Track[]): Map<string, Track[]> {
  const m = new Map<string, Track[]>()
  for (const t of tracks) {
    const a = t.artist || 'Unknown artist'
    const arr = m.get(a) ?? []
    arr.push(t)
    m.set(a, arr)
  }
  for (const arr of m.values()) {
    arr.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }))
  }
  return m
}

function groupByAlbum(tracks: readonly Track[]): Map<string, Track[]> {
  const m = new Map<string, Track[]>()
  for (const t of tracks) {
    const key = `${t.album}\u0000${t.artist}`
    const arr = m.get(key) ?? []
    arr.push(t)
    m.set(key, arr)
  }
  for (const arr of m.values()) {
    arr.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }))
  }
  return m
}

function tracksForRoot(tracks: readonly Track[], rootId: string): Track[] {
  return tracks.filter((t) => t.library?.rootId === rootId)
}

function listFolderChildren(tracksAtRoot: readonly Track[], pathPrefix: string): { folders: string[]; files: Track[] } {
  const prefixSlash = pathPrefix === '' ? '' : `${pathPrefix}/`
  const folderSet = new Set<string>()
  const files: Track[] = []
  for (const t of tracksAtRoot) {
    const rel = t.library?.relativePath ?? ''
    if (pathPrefix === '') {
      if (!rel.includes('/')) {
        files.push(t)
      } else {
        folderSet.add(rel.slice(0, rel.indexOf('/')))
      }
    } else {
      if (!rel.startsWith(prefixSlash)) continue
      const rest = rel.slice(prefixSlash.length)
      if (!rest) continue
      const idx = rest.indexOf('/')
      if (idx === -1) {
        files.push(t)
      } else {
        folderSet.add(rest.slice(0, idx))
      }
    }
  }
  files.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }))
  return {
    folders: [...folderSet].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
    files,
  }
}

function rootNameById(roots: readonly LibraryRootMeta[], id: string): string {
  return roots.find((r) => r.id === id)?.name ?? id
}

/**
 * Browse the scanned catalog by artist, album, or folder; search and add tracks to the queue.
 */
export default function LibraryBrowser() {
  const { roots, libraryTracks, addToQueue } = useLibrary()
  const [mode, setMode] = useState<BrowseMode>('artist')
  const [query, setQuery] = useState('')
  const [artistPick, setArtistPick] = useState<string | null>(null)
  const [albumPick, setAlbumPick] = useState<string | null>(null)
  const [folderRootId, setFolderRootId] = useState<string | null>(null)
  const [folderPath, setFolderPath] = useState('')

  const filtered = useMemo(() => filterTracksByQuery(libraryTracks, query), [libraryTracks, query])
  const searchActive = query.trim().length > 0

  const goMode = useCallback((m: BrowseMode) => {
    setMode(m)
    setArtistPick(null)
    setAlbumPick(null)
    setFolderRootId(null)
    setFolderPath('')
  }, [])

  const artistMap = useMemo(() => groupByArtist(filtered), [filtered])
  const albumMap = useMemo(() => groupByAlbum(filtered), [filtered])

  const artistNames = useMemo(
    () => [...artistMap.keys()].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
    [artistMap],
  )

  const albumKeys = useMemo(
    () => [...albumMap.keys()].sort((a, b) => {
      const [albumA, artistA] = a.split('\u0000')
      const [albumB, artistB] = b.split('\u0000')
      const c = albumA.localeCompare(albumB, undefined, { sensitivity: 'base' })
      return c !== 0 ? c : artistA.localeCompare(artistB, undefined, { sensitivity: 'base' })
    }),
    [albumMap],
  )

  const folderTracks = useMemo(() => {
    if (!folderRootId) return []
    return tracksForRoot(filtered, folderRootId)
  }, [filtered, folderRootId])

  const folderChildren = useMemo(() => {
    if (!folderRootId) return { folders: [] as string[], files: [] as Track[] }
    return listFolderChildren(folderTracks, folderPath)
  }, [folderRootId, folderTracks, folderPath])

  const rootsFiltered = useMemo(() => {
    const s = query.trim().toLowerCase()
    if (!s) return roots
    return roots.filter((r) => r.name.toLowerCase().includes(s))
  }, [roots, query])

  const onAdd = useCallback(
    (t: Track) => {
      addToQueue(t)
    },
    [addToQueue],
  )

  const onAddMany = useCallback(
    (list: readonly Track[]) => {
      if (list.length === 0) return
      addToQueue(list)
    },
    [addToQueue],
  )

  return (
    <section className="flex h-full min-h-0 flex-1 flex-col overflow-hidden border-b border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/30 lg:border-b-0 lg:border-r">
      <div className="shrink-0 space-y-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">Library</h2>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search title, artist, album, path…"
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none ring-amber-500/0 transition focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-amber-500/60"
          aria-label="Search library"
        />
        <div className="flex flex-wrap gap-1">
          {(['artist', 'album', 'folder'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => goMode(m)}
              className={[
                'rounded-full px-3 py-1 text-xs font-medium capitalize transition',
                mode === m
                  ? 'bg-amber-500 text-zinc-950'
                  : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700',
              ].join(' ')}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-2 py-2">
        {libraryTracks.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-zinc-500">No library tracks yet. Configure folders in settings.</p>
        ) : searchActive ? (
          <div className="space-y-1">
            <p className="px-2 pb-2 text-xs text-zinc-500">{filtered.length} match{filtered.length === 1 ? '' : 'es'}</p>
            {filtered.length === 0 ? (
              <p className="px-2 text-sm text-zinc-500">No matches.</p>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onAddMany(filtered)}
                  className="mb-2 w-full rounded-lg border border-zinc-200 bg-white py-2 text-xs font-medium text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Add all matches to queue
                </button>
                <ul className="space-y-0.5">
                  {filtered.map((t) => (
                    <li key={t.id}>
                      <div className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800/80">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{t.title}</p>
                          <p className="truncate text-xs text-zinc-500">
                            {t.artist} · {t.album}
                            {t.library?.relativePath ? ` · ${t.library.relativePath}` : ''}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs tabular-nums text-zinc-500">
                          {t.durationSec > 0 ? formatDuration(t.durationSec) : '—'}
                        </span>
                        <button
                          type="button"
                          onClick={() => onAdd(t)}
                          className="shrink-0 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-500/25 transition hover:bg-amber-500/25 dark:text-amber-300 dark:ring-amber-500/40"
                        >
                          Add
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        ) : mode === 'artist' ? (
          artistPick === null ? (
            <ul className="space-y-0.5">
              {artistNames.map((name) => (
                <li key={name}>
                  <button
                    type="button"
                    onClick={() => setArtistPick(name)}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm text-zinc-800 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800/80"
                  >
                    <span className="truncate font-medium">{name}</span>
                    <span className="shrink-0 text-xs tabular-nums text-zinc-500">{artistMap.get(name)?.length ?? 0}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div>
              <button
                type="button"
                onClick={() => setArtistPick(null)}
                className="mb-2 px-2 text-xs font-medium text-amber-700 hover:underline dark:text-amber-400"
              >
                ← Artists
              </button>
              <div className="mb-2 flex gap-2 px-2">
                <button
                  type="button"
                  onClick={() => onAddMany(artistMap.get(artistPick) ?? [])}
                  className="rounded-full border border-zinc-200 bg-white px-2 py-1 text-xs font-medium dark:border-zinc-700 dark:bg-zinc-900"
                >
                  Add all
                </button>
              </div>
              <ul className="space-y-0.5">
                {(artistMap.get(artistPick) ?? []).map((t) => (
                  <li key={t.id}>
                    <div className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800/80">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{t.title}</p>
                        <p className="truncate text-xs text-zinc-500">{t.album}</p>
                      </div>
                      <span className="shrink-0 text-xs tabular-nums text-zinc-500">
                        {t.durationSec > 0 ? formatDuration(t.durationSec) : '—'}
                      </span>
                      <button
                        type="button"
                        onClick={() => onAdd(t)}
                        className="shrink-0 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-500/25 dark:text-amber-300"
                      >
                        Add
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )
        ) : mode === 'album' ? (
          albumPick === null ? (
            <ul className="space-y-0.5">
              {albumKeys.map((key) => {
                const [album, artist] = key.split('\u0000')
                const n = albumMap.get(key)?.length ?? 0
                const sample = albumMap.get(key)?.[0]
                return (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => setAlbumPick(key)}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-zinc-100 dark:hover:bg-zinc-800/80"
                    >
                      <AlbumCoverThumb track={sample} />
                      <div className="flex min-w-0 flex-1 flex-col items-start">
                        <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{album}</span>
                        <span className="truncate text-xs text-zinc-500">{artist}</span>
                        <span className="mt-0.5 text-xs text-zinc-400">{n} track{n === 1 ? '' : 's'}</span>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div>
              <button
                type="button"
                onClick={() => setAlbumPick(null)}
                className="mb-2 px-2 text-xs font-medium text-amber-700 hover:underline dark:text-amber-400"
              >
                ← Albums
              </button>
              <div className="mb-2 flex gap-2 px-2">
                <button
                  type="button"
                  onClick={() => onAddMany(albumMap.get(albumPick) ?? [])}
                  className="rounded-full border border-zinc-200 bg-white px-2 py-1 text-xs font-medium dark:border-zinc-700 dark:bg-zinc-900"
                >
                  Add all
                </button>
              </div>
              <ul className="space-y-0.5">
                {(albumMap.get(albumPick) ?? []).map((t) => (
                  <li key={t.id}>
                    <div className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800/80">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{t.title}</p>
                        <p className="truncate text-xs text-zinc-500">{t.artist}</p>
                      </div>
                      <span className="shrink-0 text-xs tabular-nums text-zinc-500">
                        {t.durationSec > 0 ? formatDuration(t.durationSec) : '—'}
                      </span>
                      <button
                        type="button"
                        onClick={() => onAdd(t)}
                        className="shrink-0 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-500/25 dark:text-amber-300"
                      >
                        Add
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )
        ) : folderRootId === null ? (
          <ul className="space-y-0.5">
            {rootsFiltered.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => {
                    setFolderRootId(r.id)
                    setFolderPath('')
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-zinc-100 dark:hover:bg-zinc-800/80"
                >
                  <span className="truncate font-medium text-zinc-900 dark:text-zinc-100">{r.name}</span>
                  <span className="shrink-0 text-xs text-zinc-500">{tracksForRoot(filtered, r.id).length}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div>
            <button
              type="button"
              onClick={() => {
                if (folderPath === '') {
                  setFolderRootId(null)
                } else {
                  const parts = folderPath.split('/').filter(Boolean)
                  parts.pop()
                  setFolderPath(parts.join('/'))
                }
              }}
              className="mb-2 px-2 text-xs font-medium text-amber-700 hover:underline dark:text-amber-400"
            >
              ← {folderPath === '' ? 'Libraries' : 'Up'}
            </button>
            <p className="mb-2 truncate px-2 text-xs text-zinc-500" title={folderPath || '/'}>
              {rootNameById(roots, folderRootId)}
              {folderPath ? ` / ${folderPath.replace(/\//g, ' / ')}` : ''}
            </p>
            <div className="mb-2 flex flex-wrap gap-2 px-2">
              <button
                type="button"
                onClick={() => onAddMany(folderChildren.files)}
                disabled={folderChildren.files.length === 0}
                className="rounded-full border border-zinc-200 bg-white px-2 py-1 text-xs font-medium disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900"
              >
                Add all files here
              </button>
            </div>
            <ul className="space-y-0.5">
              {folderChildren.folders.map((name) => (
                <li key={name}>
                  <button
                    type="button"
                    onClick={() => setFolderPath(folderPath === '' ? name : `${folderPath}/${name}`)}
                    className="flex w-full items-center rounded-lg py-2.5 pr-3 pl-6 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800/80"
                  >
                    <span className="truncate font-medium text-zinc-900 dark:text-zinc-100">{name}</span>
                  </button>
                </li>
              ))}
              {folderChildren.files.map((t) => (
                <li key={t.id}>
                  <div className="flex items-center gap-2 rounded-lg px-2 py-2 pl-4 hover:bg-zinc-100 dark:hover:bg-zinc-800/80">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{t.title}</p>
                    </div>
                    <span className="shrink-0 text-xs tabular-nums text-zinc-500">
                      {t.durationSec > 0 ? formatDuration(t.durationSec) : '—'}
                    </span>
                    <button
                      type="button"
                      onClick={() => onAdd(t)}
                      className="shrink-0 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-500/25 dark:text-amber-300"
                    >
                      Add
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}
