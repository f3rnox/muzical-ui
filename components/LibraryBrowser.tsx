'use client'

import { useCallback, useMemo, useState } from 'react'
import { useLibrary } from '@/components/LibraryProvider'
import type { LibraryRootMeta } from '@/components/LibraryProvider'
import type { Track } from '@/types/track'
import AlbumCoverThumb from '@/components/AlbumCoverThumb'
import FavoriteStarButton from '@/components/FavoriteStarButton'
import { albumCompositeKey, artistDisplayName } from '@/lib/library/favorite-keys'
import { formatDuration } from '@/lib/format-duration'

type BrowseMode = 'artist' | 'album' | 'folder' | 'favorites'

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

function normQ(query: string): string {
  return query.trim().toLowerCase()
}

function folderPathMatchesQuery(folderPath: string, q: string): boolean {
  if (!q) return false
  const p = folderPath.toLowerCase()
  if (p.includes(q)) return true
  return folderPath
    .split('/')
    .filter(Boolean)
    .some((seg) => seg.toLowerCase().includes(q))
}

/** Parent folder paths for `a/b/track.mp3` → `['a','a/b']`. */
function ancestorFolderPathsFromRelativePath(relativePath: string): string[] {
  const parts = relativePath.split('/').filter(Boolean)
  if (parts.length <= 1) return []
  const out: string[] = []
  for (let i = 0; i < parts.length - 1; i++) {
    out.push(parts.slice(0, i + 1).join('/'))
  }
  return out
}

type SearchArtistHit = { name: string; tracks: Track[] }
type SearchAlbumHit = { key: string; album: string; artist: string; tracks: Track[] }
type SearchFolderHit = { rootId: string; rootName: string; path: string; tracks: Track[] }

type SearchResults = {
  artists: SearchArtistHit[]
  albums: SearchAlbumHit[]
  folders: SearchFolderHit[]
  songs: Track[]
}

function computeSearchResults(
  tracks: readonly Track[],
  roots: readonly LibraryRootMeta[],
  query: string,
): SearchResults {
  const q = normQ(query)
  if (!q) {
    return { artists: [], albums: [], folders: [], songs: [] }
  }

  const rootLabel = (rootId: string): string => roots.find((r) => r.id === rootId)?.name ?? rootId

  const artistMapFull = groupByArtist(tracks)
  const artists: SearchArtistHit[] = []
  for (const [name, list] of artistMapFull) {
    if (name.toLowerCase().includes(q)) {
      artists.push({ name, tracks: list })
    }
  }
  artists.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))

  const albumMapFull = groupByAlbum(tracks)
  const albums: SearchAlbumHit[] = []
  for (const [key, list] of albumMapFull) {
    const [album, artist] = key.split('\u0000')
    if (album.toLowerCase().includes(q) || artist.toLowerCase().includes(q)) {
      albums.push({ key, album, artist, tracks: list })
    }
  }
  albums.sort((a, b) => {
    const c = a.album.localeCompare(b.album, undefined, { sensitivity: 'base' })
    return c !== 0 ? c : a.artist.localeCompare(b.artist, undefined, { sensitivity: 'base' })
  })

  const folderBuckets = new Map<string, SearchFolderHit>()
  const addToFolder = (rootId: string, path: string, t: Track): void => {
    const key = `${rootId}\u0000${path}`
    let hit = folderBuckets.get(key)
    if (!hit) {
      hit = { rootId, rootName: rootLabel(rootId), path, tracks: [] }
      folderBuckets.set(key, hit)
    }
    if (!hit.tracks.some((x) => x.id === t.id)) {
      hit.tracks.push(t)
    }
  }

  for (const r of roots) {
    if (r.name.toLowerCase().includes(q)) {
      for (const t of tracks) {
        if (t.library?.rootId === r.id) {
          addToFolder(r.id, '', t)
        }
      }
    }
  }

  for (const t of tracks) {
    const lib = t.library
    if (!lib) continue
    const rel = lib.relativePath
    for (const folderPath of ancestorFolderPathsFromRelativePath(rel)) {
      if (folderPathMatchesQuery(folderPath, q)) {
        addToFolder(lib.rootId, folderPath, t)
      }
    }
  }

  const folders = [...folderBuckets.values()].sort((a, b) => {
    const c = a.rootName.localeCompare(b.rootName, undefined, { sensitivity: 'base' })
    if (c !== 0) return c
    return a.path.localeCompare(b.path, undefined, { sensitivity: 'base' })
  })

  const songs = tracks
    .filter((t) => t.title.toLowerCase().includes(q))
    .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }))

  return { artists, albums, folders, songs }
}

function unionTracksById(lists: readonly (readonly Track[])[]): Track[] {
  const seen = new Set<string>()
  const out: Track[] = []
  for (const list of lists) {
    for (const t of list) {
      if (seen.has(t.id)) continue
      seen.add(t.id)
      out.push(t)
    }
  }
  return out
}

function folderSearchLabel(hit: SearchFolderHit): string {
  if (!hit.path) return `${hit.rootName} (library)`
  return `${hit.rootName} / ${hit.path.replace(/\//g, ' / ')}`
}

function groupByArtist(tracks: readonly Track[]): Map<string, Track[]> {
  const m = new Map<string, Track[]>()
  for (const t of tracks) {
    const a = artistDisplayName(t.artist)
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
    const key = albumCompositeKey(t.album, t.artist)
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

/** All tracks under a folder path within one library root (recursive). */
function tracksUnderFolderPath(tracksAtRoot: readonly Track[], folderPath: string): Track[] {
  const fp = folderPath.trim()
  if (!fp) return [...tracksAtRoot]
  const prefix = `${fp}/`
  return tracksAtRoot.filter((t) => {
    const rel = t.library?.relativePath ?? ''
    return rel === fp || rel.startsWith(prefix)
  })
}

/**
 * Browse the scanned catalog by artist, album, or folder; search and add tracks to the queue.
 */
export default function LibraryBrowser() {
  const {
    roots,
    libraryTracks,
    addToQueue,
    compactLists,
    favoriteSongIds,
    favoriteArtistNames,
    favoriteAlbumKeys,
    isFavoriteSong,
    isFavoriteArtist,
    isFavoriteAlbum,
    toggleFavoriteArtist,
    toggleFavoriteAlbum,
    toggleFavoriteTrack,
  } = useLibrary()
  const [mode, setMode] = useState<BrowseMode>('artist')
  const [query, setQuery] = useState('')
  const [artistPick, setArtistPick] = useState<string | null>(null)
  const [albumPick, setAlbumPick] = useState<string | null>(null)
  const [folderRootId, setFolderRootId] = useState<string | null>(null)
  const [folderPath, setFolderPath] = useState('')

  const filtered = useMemo(() => filterTracksByQuery(libraryTracks, query), [libraryTracks, query])
  const searchActive = query.trim().length > 0
  const compact = compactLists
  const ulSpaceYClass = compact ? 'space-y-0.25' : 'space-y-0.5'
  const rowPadLgClass = compact ? 'px-2 py-2' : 'px-3 py-2.5'
  const rowPadSmClass = compact ? 'px-1.5 py-1.5' : 'px-2 py-2'
  const rowGapSmClass = compact ? 'gap-1.5' : 'gap-2'
  const rowGapLgClass = compact ? 'gap-2' : 'gap-3'
  const folderRowPadClass = compact ? 'py-2 pr-2 pl-5' : 'py-2.5 pr-3 pl-6'

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

  const selectedAlbumDetail = useMemo(() => {
    if (albumPick === null) return null
    const tracks = albumMap.get(albumPick) ?? []
    const parts = albumPick.split('\u0000')
    const title = parts[0] ?? ''
    const artist = parts[1] ?? ''
    let totalSec = 0
    let withDuration = 0
    for (const t of tracks) {
      if (t.durationSec > 0) {
        totalSec += t.durationSec
        withDuration += 1
      }
    }
    const rootIdSet = new Set<string>()
    for (const t of tracks) {
      const id = t.library?.rootId
      if (id) rootIdSet.add(id)
    }
    const rootLabels = [...rootIdSet]
      .map((id) => roots.find((r) => r.id === id)?.name ?? id)
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    const uniqueArtists = new Set(tracks.map((t) => artistDisplayName(t.artist)))
    return {
      title,
      artist,
      trackCount: tracks.length,
      totalSec,
      withDurationCount: withDuration,
      sample: tracks[0],
      rootLabels,
      multipleTrackArtists: uniqueArtists.size > 1,
    }
  }, [albumPick, albumMap, roots])

  const folderTracks = useMemo(() => {
    if (!folderRootId) return []
    return tracksForRoot(filtered, folderRootId)
  }, [filtered, folderRootId])

  const folderChildren = useMemo(() => {
    if (!folderRootId) return { folders: [] as string[], files: [] as Track[] }
    return listFolderChildren(folderTracks, folderPath)
  }, [folderRootId, folderTracks, folderPath])

  const folderSubtreeTracks = useMemo(
    () => tracksUnderFolderPath(folderTracks, folderPath),
    [folderTracks, folderPath],
  )

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

  const searchResults = useMemo(
    () => computeSearchResults(libraryTracks, roots, query),
    [libraryTracks, roots, query],
  )

  const searchUnionTracks = useMemo(
    () =>
      unionTracksById([
        searchResults.artists.flatMap((a) => a.tracks),
        searchResults.albums.flatMap((a) => a.tracks),
        searchResults.folders.flatMap((f) => f.tracks),
        searchResults.songs,
      ]),
    [searchResults],
  )

  const libraryArtistMap = useMemo(() => groupByArtist(libraryTracks), [libraryTracks])
  const libraryAlbumMap = useMemo(() => groupByAlbum(libraryTracks), [libraryTracks])

  const favoritedArtistsList = useMemo(() => {
    return favoriteArtistNames
      .filter((n) => libraryArtistMap.has(n))
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  }, [favoriteArtistNames, libraryArtistMap])

  const favoritedAlbumsList = useMemo(() => {
    return favoriteAlbumKeys
      .filter((k) => libraryAlbumMap.has(k))
      .sort((a, b) => {
        const [albumA, artistA] = a.split('\u0000')
        const [albumB, artistB] = b.split('\u0000')
        const c = albumA.localeCompare(albumB, undefined, { sensitivity: 'base' })
        return c !== 0 ? c : artistA.localeCompare(artistB, undefined, { sensitivity: 'base' })
      })
  }, [favoriteAlbumKeys, libraryAlbumMap])

  const favoritedTracks = useMemo(() => {
    const set = new Set(favoriteSongIds)
    return libraryTracks
      .filter((t) => set.has(t.id))
      .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }))
  }, [libraryTracks, favoriteSongIds])

  const allFavoriteTracksUnion = useMemo(() => {
    const seen = new Set<string>()
    const out: Track[] = []
    const push = (t: Track): void => {
      if (seen.has(t.id)) return
      seen.add(t.id)
      out.push(t)
    }
    for (const id of favoriteSongIds) {
      const t = libraryTracks.find((x) => x.id === id)
      if (t) push(t)
    }
    for (const name of favoriteArtistNames) {
      const list = libraryArtistMap.get(name)
      if (list) for (const t of list) push(t)
    }
    for (const k of favoriteAlbumKeys) {
      const list = libraryAlbumMap.get(k)
      if (list) for (const t of list) push(t)
    }
    out.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }))
    return out
  }, [favoriteSongIds, favoriteArtistNames, favoriteAlbumKeys, libraryTracks, libraryArtistMap, libraryAlbumMap])

  const searchSummaryBits = useMemo((): string[] => {
    const bits: string[] = []
    const { artists, albums, folders, songs } = searchResults
    if (artists.length) bits.push(`${artists.length} artist${artists.length === 1 ? '' : 's'}`)
    if (albums.length) bits.push(`${albums.length} album${albums.length === 1 ? '' : 's'}`)
    if (folders.length) bits.push(`${folders.length} folder${folders.length === 1 ? '' : 's'}`)
    if (songs.length) bits.push(`${songs.length} song${songs.length === 1 ? '' : 's'}`)
    return bits
  }, [searchResults])

  const navigateToArtistFromSearch = useCallback((name: string) => {
    setQuery('')
    setAlbumPick(null)
    setFolderRootId(null)
    setFolderPath('')
    setMode('artist')
    setArtistPick(name)
  }, [])

  const navigateToAlbumFromSearch = useCallback((key: string) => {
    setQuery('')
    setArtistPick(null)
    setFolderRootId(null)
    setFolderPath('')
    setMode('album')
    setAlbumPick(key)
  }, [])

  const navigateToFolderFromSearch = useCallback((rootId: string, path: string) => {
    setQuery('')
    setArtistPick(null)
    setAlbumPick(null)
    setMode('folder')
    setFolderRootId(rootId)
    setFolderPath(path)
  }, [])

  return (
    <section className="flex h-full min-h-0 flex-1 flex-col overflow-hidden border-b border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/30 lg:border-b-0 lg:border-r">
      <div className="shrink-0 space-y-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">Library</h2>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Artists, albums, folders, or song titles…"
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none ring-amber-500/0 transition focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-amber-500/60"
          aria-label="Search library"
        />
        <div className="flex flex-wrap gap-1">
          {(['artist', 'album', 'folder', 'favorites'] as const).map((m) => (
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
            <p className="px-2 pb-2 text-xs text-zinc-500">
              {searchSummaryBits.length > 0 ? (
                <>
                  {searchSummaryBits.join(' · ')}
                  {searchUnionTracks.length > 0 ? (
                    <span className="text-zinc-400">
                      {' '}
                      · {searchUnionTracks.length} unique track{searchUnionTracks.length === 1 ? '' : 's'} (add all)
                    </span>
                  ) : null}
                </>
              ) : (
                'No matches.'
              )}
            </p>
            {searchSummaryBits.length > 0 ? (
              <>
                <button
                  type="button"
                  onClick={() => onAddMany(searchUnionTracks)}
                  disabled={searchUnionTracks.length === 0}
                  className="mb-2 w-full rounded-lg border border-zinc-200 bg-white py-2 text-xs font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Add all search results to queue
                </button>
                {searchResults.artists.length > 0 ? (
                  <>
                    <p className="px-2 pt-2 text-xs font-medium uppercase tracking-wider text-zinc-500">Artists</p>
                    <ul className={ulSpaceYClass}>
                      {searchResults.artists.map((hit) => (
                        <li key={hit.name} className="group/row flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => navigateToArtistFromSearch(hit.name)}
                            className={`flex min-w-0 flex-1 items-center justify-between rounded-lg ${rowPadLgClass} text-left text-sm text-zinc-800 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800/80`}
                          >
                            <span className="truncate font-medium text-zinc-900 dark:text-zinc-100">{hit.name}</span>
                            <span className="shrink-0 text-xs tabular-nums text-zinc-500">{hit.tracks.length}</span>
                          </button>
                          <FavoriteStarButton
                            filled={isFavoriteArtist(hit.name)}
                            onPress={() => toggleFavoriteArtist(hit.name)}
                            label={isFavoriteArtist(hit.name) ? 'Remove artist from favorites' : 'Add artist to favorites'}
                          />
                          <button
                            type="button"
                            onClick={() => onAddMany(hit.tracks)}
                            disabled={hit.tracks.length === 0}
                            className="shrink-0 self-center rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-500/25 transition hover:bg-amber-500/25 disabled:opacity-40 dark:text-amber-300 dark:ring-amber-500/40"
                          >
                            Add all
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
                {searchResults.albums.length > 0 ? (
                  <>
                    <p className="px-2 pt-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Albums</p>
                    <ul className={ulSpaceYClass}>
                      {searchResults.albums.map((hit) => {
                        const sample = hit.tracks[0]
                        return (
                          <li key={hit.key} className="group/row flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => navigateToAlbumFromSearch(hit.key)}
                            className={`flex min-w-0 flex-1 items-center ${rowGapLgClass} rounded-lg ${rowPadLgClass} text-left transition hover:bg-zinc-100 dark:hover:bg-zinc-800/80`}
                            >
                              <AlbumCoverThumb track={sample} />
                              <div className="flex min-w-0 flex-1 flex-col items-start">
                                <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                  {hit.album}
                                </span>
                                <span className="truncate text-xs text-zinc-500">{hit.artist}</span>
                                <span className="mt-0.5 text-xs text-zinc-400">
                                  {hit.tracks.length} track{hit.tracks.length === 1 ? '' : 's'}
                                </span>
                              </div>
                            </button>
                            <FavoriteStarButton
                              filled={isFavoriteAlbum(hit.key)}
                              onPress={() => toggleFavoriteAlbum(hit.key)}
                              label={
                                isFavoriteAlbum(hit.key) ? 'Remove album from favorites' : 'Add album to favorites'
                              }
                            />
                            <button
                              type="button"
                              onClick={() => onAddMany(hit.tracks)}
                              disabled={hit.tracks.length === 0}
                              className="shrink-0 self-center rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-500/25 transition hover:bg-amber-500/25 disabled:opacity-40 dark:text-amber-300 dark:ring-amber-500/40"
                            >
                              Add all
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </>
                ) : null}
                {searchResults.folders.length > 0 ? (
                  <>
                    <p className="px-2 pt-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Folders</p>
                    <ul className={ulSpaceYClass}>
                      {searchResults.folders.map((hit) => (
                        <li
                          key={`${hit.rootId}\u0000${hit.path}`}
                          className="group/row flex items-center gap-1"
                        >
                          <button
                            type="button"
                            onClick={() => navigateToFolderFromSearch(hit.rootId, hit.path)}
                            className={`flex min-w-0 flex-1 flex-col items-start rounded-lg ${rowPadLgClass} text-left text-sm transition hover:bg-zinc-100 dark:hover:bg-zinc-800/80`}
                          >
                            <span className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                              {folderSearchLabel(hit)}
                            </span>
                            <span className="mt-0.5 text-xs tabular-nums text-zinc-500">{hit.tracks.length} tracks</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onAddMany(hit.tracks)}
                            disabled={hit.tracks.length === 0}
                            className="shrink-0 self-center rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-500/25 transition hover:bg-amber-500/25 disabled:opacity-40 dark:text-amber-300 dark:ring-amber-500/40"
                          >
                            Add all
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
                {searchResults.songs.length > 0 ? (
                  <>
                    <p className="px-2 pt-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Songs</p>
                    <ul className={ulSpaceYClass}>
                      {searchResults.songs.map((t) => (
                        <li key={t.id}>
                          <div
                            className={`flex items-center ${rowGapSmClass} rounded-lg ${rowPadSmClass} hover:bg-zinc-100 dark:hover:bg-zinc-800/80`}
                          >
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
                            <FavoriteStarButton
                              filled={isFavoriteSong(t.id)}
                              onPress={() => toggleFavoriteTrack(t)}
                              label={isFavoriteSong(t.id) ? 'Remove song from favorites' : 'Add song to favorites'}
                            />
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
                ) : null}
              </>
            ) : null}
          </div>
        ) : mode === 'artist' ? (
          artistPick === null ? (
            <ul className={ulSpaceYClass}>
              {artistNames.map((name) => (
                <li key={name} className="group/row flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setArtistPick(name)}
                    className={`flex min-w-0 flex-1 items-center justify-between rounded-lg ${rowPadLgClass} text-left text-sm text-zinc-800 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800/80`}
                  >
                    <span className="truncate font-medium">{name}</span>
                    <span className="shrink-0 text-xs tabular-nums text-zinc-500">{artistMap.get(name)?.length ?? 0}</span>
                  </button>
                  <FavoriteStarButton
                    filled={isFavoriteArtist(name)}
                    onPress={() => toggleFavoriteArtist(name)}
                    label={isFavoriteArtist(name) ? 'Remove artist from favorites' : 'Add artist to favorites'}
                  />
                  <button
                    type="button"
                    onClick={() => onAddMany(artistMap.get(name) ?? [])}
                    disabled={(artistMap.get(name)?.length ?? 0) === 0}
                    className="shrink-0 self-center rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-500/25 transition hover:bg-amber-500/25 disabled:opacity-40 dark:text-amber-300 dark:ring-amber-500/40"
                  >
                    Add all
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
              <div className="mb-2 flex flex-wrap items-center gap-2 px-2">
                <button
                  type="button"
                  onClick={() => onAddMany(artistMap.get(artistPick) ?? [])}
                  className="rounded-full border border-zinc-200 bg-white px-2 py-1 text-xs font-medium dark:border-zinc-700 dark:bg-zinc-900"
                >
                  Add all
                </button>
                {artistPick ? (
                  <FavoriteStarButton
                    filled={isFavoriteArtist(artistPick)}
                    onPress={() => toggleFavoriteArtist(artistPick)}
                    label={
                      isFavoriteArtist(artistPick) ? 'Remove artist from favorites' : 'Add artist to favorites'
                    }
                  />
                ) : null}
              </div>
              <ul className={ulSpaceYClass}>
                {(artistMap.get(artistPick) ?? []).map((t) => (
                  <li key={t.id}>
                    <div
                      className={`flex items-center ${rowGapSmClass} rounded-lg ${rowPadSmClass} hover:bg-zinc-100 dark:hover:bg-zinc-800/80`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{t.title}</p>
                        <p className="truncate text-xs text-zinc-500">{t.album}</p>
                      </div>
                      <span className="shrink-0 text-xs tabular-nums text-zinc-500">
                        {t.durationSec > 0 ? formatDuration(t.durationSec) : '—'}
                      </span>
                      <FavoriteStarButton
                        filled={isFavoriteSong(t.id)}
                        onPress={() => toggleFavoriteTrack(t)}
                        label={isFavoriteSong(t.id) ? 'Remove song from favorites' : 'Add song to favorites'}
                      />
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
              <ul className={ulSpaceYClass}>
              {albumKeys.map((key) => {
                const [album, artist] = key.split('\u0000')
                const n = albumMap.get(key)?.length ?? 0
                const sample = albumMap.get(key)?.[0]
                return (
                  <li key={key} className="group/row flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setAlbumPick(key)}
                      className={`flex min-w-0 flex-1 items-center ${rowGapLgClass} rounded-lg ${rowPadLgClass} text-left transition hover:bg-zinc-100 dark:hover:bg-zinc-800/80`}
                    >
                      <AlbumCoverThumb track={sample} />
                      <div className="flex min-w-0 flex-1 flex-col items-start">
                        <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{album}</span>
                        <span className="truncate text-xs text-zinc-500">{artist}</span>
                        <span className="mt-0.5 text-xs text-zinc-400">{n} track{n === 1 ? '' : 's'}</span>
                      </div>
                    </button>
                    <FavoriteStarButton
                      filled={isFavoriteAlbum(key)}
                      onPress={() => toggleFavoriteAlbum(key)}
                      label={isFavoriteAlbum(key) ? 'Remove album from favorites' : 'Add album to favorites'}
                    />
                    <button
                      type="button"
                      onClick={() => onAddMany(albumMap.get(key) ?? [])}
                      disabled={n === 0}
                      className="shrink-0 self-center rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-500/25 transition hover:bg-amber-500/25 disabled:opacity-40 dark:text-amber-300 dark:ring-amber-500/40"
                    >
                      Add all
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
              {selectedAlbumDetail ? (
                <div className="mb-4 border-b border-zinc-200 px-2 pb-4 dark:border-zinc-800">
                  <div className="flex gap-4">
                    <AlbumCoverThumb
                      track={selectedAlbumDetail.sample}
                      className="h-22 w-22 shrink-0 overflow-hidden rounded-lg ring-1 ring-zinc-200/80 dark:ring-zinc-700/80"
                    />
                    <div className="min-w-0 flex-1 py-0.5">
                      <h3 className="text-lg font-semibold leading-tight text-zinc-900 dark:text-zinc-50">
                        {selectedAlbumDetail.title}
                      </h3>
                      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{selectedAlbumDetail.artist}</p>
                      {selectedAlbumDetail.multipleTrackArtists ? (
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                          Track-level artists differ on this album
                        </p>
                      ) : null}
                      <p className="mt-2 text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                        {selectedAlbumDetail.trackCount} track{selectedAlbumDetail.trackCount === 1 ? '' : 's'}
                        {selectedAlbumDetail.totalSec > 0
                          ? ` · ${formatDuration(selectedAlbumDetail.totalSec)} total`
                          : selectedAlbumDetail.trackCount > 0
                            ? ' · unknown total length'
                            : ''}
                        {selectedAlbumDetail.withDurationCount > 0 &&
                        selectedAlbumDetail.withDurationCount < selectedAlbumDetail.trackCount ? (
                          <span className="text-zinc-400"> ({selectedAlbumDetail.withDurationCount} timed)</span>
                        ) : null}
                      </p>
                      {selectedAlbumDetail.rootLabels.length > 1 ? (
                        <p className="mt-1.5 text-xs leading-snug text-zinc-500 dark:text-zinc-500">
                          Libraries: {selectedAlbumDetail.rootLabels.join(' · ')}
                        </p>
                      ) : selectedAlbumDetail.rootLabels.length === 1 ? (
                        <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-500">
                          Library: {selectedAlbumDetail.rootLabels[0]}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}
              <div className="mb-2 flex flex-wrap items-center gap-2 px-2">
                <button
                  type="button"
                  onClick={() => onAddMany(albumMap.get(albumPick) ?? [])}
                  className="rounded-full border border-zinc-200 bg-white px-2 py-1 text-xs font-medium dark:border-zinc-700 dark:bg-zinc-900"
                >
                  Add all
                </button>
                {albumPick ? (
                  <FavoriteStarButton
                    filled={isFavoriteAlbum(albumPick)}
                    onPress={() => toggleFavoriteAlbum(albumPick)}
                    label={isFavoriteAlbum(albumPick) ? 'Remove album from favorites' : 'Add album to favorites'}
                  />
                ) : null}
              </div>
              <ul className={ulSpaceYClass}>
                {(albumMap.get(albumPick) ?? []).map((t) => (
                  <li key={t.id}>
                    <div
                      className={`flex items-center ${rowGapSmClass} rounded-lg ${rowPadSmClass} hover:bg-zinc-100 dark:hover:bg-zinc-800/80`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{t.title}</p>
                        <p className="truncate text-xs text-zinc-500">{t.artist}</p>
                      </div>
                      <span className="shrink-0 text-xs tabular-nums text-zinc-500">
                        {t.durationSec > 0 ? formatDuration(t.durationSec) : '—'}
                      </span>
                      <FavoriteStarButton
                        filled={isFavoriteSong(t.id)}
                        onPress={() => toggleFavoriteTrack(t)}
                        label={isFavoriteSong(t.id) ? 'Remove song from favorites' : 'Add song to favorites'}
                      />
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
        ) : mode === 'favorites' ? (
          <div className="space-y-4 px-1">
            <div className="flex flex-wrap gap-2 px-2">
              <button
                type="button"
                onClick={() => onAddMany(allFavoriteTracksUnion)}
                disabled={allFavoriteTracksUnion.length === 0}
                className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900"
              >
                Add all favorite tracks ({allFavoriteTracksUnion.length})
              </button>
            </div>
            {favoritedArtistsList.length === 0 && favoritedAlbumsList.length === 0 && favoritedTracks.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-zinc-500">
                No favorites yet. Use the star on artists, albums, or songs while browsing or searching.
              </p>
            ) : (
              <>
                {favoritedArtistsList.length > 0 ? (
                  <div>
                    <p className="px-2 pb-1 text-xs font-medium uppercase tracking-wider text-zinc-500">Artists</p>
                    <ul className={ulSpaceYClass}>
                      {favoritedArtistsList.map((name) => (
                        <li key={name} className="group/row flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              goMode('artist')
                              setArtistPick(name)
                            }}
                            className={`flex min-w-0 flex-1 items-center justify-between rounded-lg ${rowPadLgClass} text-left text-sm text-zinc-800 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800/80`}
                          >
                            <span className="truncate font-medium text-zinc-900 dark:text-zinc-100">{name}</span>
                            <span className="shrink-0 text-xs tabular-nums text-zinc-500">
                              {libraryArtistMap.get(name)?.length ?? 0}
                            </span>
                          </button>
                          <FavoriteStarButton
                            filled
                            onPress={() => toggleFavoriteArtist(name)}
                            label="Remove artist from favorites"
                          />
                          <button
                            type="button"
                            onClick={() => onAddMany(libraryArtistMap.get(name) ?? [])}
                            disabled={(libraryArtistMap.get(name)?.length ?? 0) === 0}
                            className="shrink-0 self-center rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-500/25 transition hover:bg-amber-500/25 disabled:opacity-40 dark:text-amber-300 dark:ring-amber-500/40"
                          >
                            Add all
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {favoritedAlbumsList.length > 0 ? (
                  <div>
                    <p className="px-2 pb-1 pt-2 text-xs font-medium uppercase tracking-wider text-zinc-500">Albums</p>
                    <ul className={ulSpaceYClass}>
                      {favoritedAlbumsList.map((key) => {
                        const [album, artist] = key.split('\u0000')
                        const list = libraryAlbumMap.get(key) ?? []
                        const sample = list[0]
                        return (
                          <li key={key} className="group/row flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                goMode('album')
                                setAlbumPick(key)
                              }}
                              className={`flex min-w-0 flex-1 items-center ${rowGapLgClass} rounded-lg ${rowPadLgClass} text-left transition hover:bg-zinc-100 dark:hover:bg-zinc-800/80`}
                            >
                              <AlbumCoverThumb track={sample} />
                              <div className="flex min-w-0 flex-1 flex-col items-start">
                                <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                  {album}
                                </span>
                                <span className="truncate text-xs text-zinc-500">{artist}</span>
                                <span className="mt-0.5 text-xs text-zinc-400">
                                  {list.length} track{list.length === 1 ? '' : 's'}
                                </span>
                              </div>
                            </button>
                            <FavoriteStarButton
                              filled
                              onPress={() => toggleFavoriteAlbum(key)}
                              label="Remove album from favorites"
                            />
                            <button
                              type="button"
                              onClick={() => onAddMany(list)}
                              disabled={list.length === 0}
                              className="shrink-0 self-center rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-500/25 transition hover:bg-amber-500/25 disabled:opacity-40 dark:text-amber-300 dark:ring-amber-500/40"
                            >
                              Add all
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ) : null}
                {favoritedTracks.length > 0 ? (
                  <div>
                    <p className="px-2 pb-1 pt-2 text-xs font-medium uppercase tracking-wider text-zinc-500">Songs</p>
                    <ul className={ulSpaceYClass}>
                      {favoritedTracks.map((t) => (
                        <li key={t.id}>
                          <div
                            className={`flex items-center ${rowGapSmClass} rounded-lg ${rowPadSmClass} hover:bg-zinc-100 dark:hover:bg-zinc-800/80`}
                          >
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
                            <FavoriteStarButton
                              filled
                              onPress={() => toggleFavoriteTrack(t)}
                              label="Remove song from favorites"
                            />
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
                  </div>
                ) : null}
              </>
            )}
          </div>
        ) : folderRootId === null ? (
          <ul className={ulSpaceYClass}>
            {rootsFiltered.map((r) => {
              const rootTracks = tracksForRoot(filtered, r.id)
              return (
                <li key={r.id} className="group/row flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setFolderRootId(r.id)
                      setFolderPath('')
                    }}
                    className={`flex min-w-0 flex-1 items-center justify-between rounded-lg ${rowPadLgClass} text-left text-sm transition hover:bg-zinc-100 dark:hover:bg-zinc-800/80`}
                  >
                    <span className="truncate font-medium text-zinc-900 dark:text-zinc-100">{r.name}</span>
                    <span className="shrink-0 text-xs text-zinc-500">{rootTracks.length}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onAddMany(rootTracks)}
                    disabled={rootTracks.length === 0}
                    className="shrink-0 self-center rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-500/25 transition hover:bg-amber-500/25 disabled:opacity-40 dark:text-amber-300 dark:ring-amber-500/40"
                  >
                    Add all
                  </button>
                </li>
              )
            })}
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
                onClick={() => onAddMany(folderSubtreeTracks)}
                disabled={folderSubtreeTracks.length === 0}
                className="rounded-full border border-zinc-200 bg-white px-2 py-1 text-xs font-medium disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900"
              >
                Add entire folder
              </button>
              <button
                type="button"
                onClick={() => onAddMany(folderChildren.files)}
                disabled={folderChildren.files.length === 0}
                className="rounded-full border border-zinc-200 bg-white px-2 py-1 text-xs font-medium disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900"
              >
                Add files in this level only
              </button>
            </div>
            <ul className={ulSpaceYClass}>
              {folderChildren.folders.map((name) => {
                const childPath = folderPath === '' ? name : `${folderPath}/${name}`
                const subtree = tracksUnderFolderPath(folderTracks, childPath)
                return (
                  <li key={name} className="group/row flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setFolderPath(childPath)}
                      className={`flex min-w-0 flex-1 items-center rounded-lg ${folderRowPadClass} text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800/80`}
                    >
                      <span className="truncate font-medium text-zinc-900 dark:text-zinc-100">{name}</span>
                      <span className="ml-2 shrink-0 text-xs tabular-nums text-zinc-500">{subtree.length}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onAddMany(subtree)}
                      disabled={subtree.length === 0}
                      className="shrink-0 self-center rounded-full bg-amber-500/15 px-2 py-1 text-[11px] font-medium text-amber-800 ring-1 ring-amber-500/25 transition hover:bg-amber-500/25 disabled:opacity-40 dark:text-amber-300 dark:ring-amber-500/40"
                    >
                      Add all
                    </button>
                  </li>
                )
              })}
              {folderChildren.files.map((t) => (
                <li key={t.id}>
                  <div
                    className={`flex items-center ${rowGapSmClass} rounded-lg ${rowPadSmClass} ${
                      compact ? 'pl-3' : 'pl-4'
                    } hover:bg-zinc-100 dark:hover:bg-zinc-800/80`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{t.title}</p>
                    </div>
                    <span className="shrink-0 text-xs tabular-nums text-zinc-500">
                      {t.durationSec > 0 ? formatDuration(t.durationSec) : '—'}
                    </span>
                    <FavoriteStarButton
                      filled={isFavoriteSong(t.id)}
                      onPress={() => toggleFavoriteTrack(t)}
                      label={isFavoriteSong(t.id) ? 'Remove song from favorites' : 'Add song to favorites'}
                    />
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
