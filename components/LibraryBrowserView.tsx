'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLibrary } from '@/components/LibraryProvider'
import AlbumCoverThumb from '@/components/AlbumCoverThumb'
import FavoriteStarButton from '@/components/FavoriteStarButton'
import TrackRowOverflowMenu from '@/components/TrackRowOverflowMenu'
import buildTrackOverflowMenuItems from '@/lib/track/build-track-overflow-menu-items'
import { albumCompositeKey, artistDisplayName } from '@/lib/library/favorite-keys'
import { formatDuration } from '@/lib/format-duration'
import buildTrackDetailRows from '@/lib/track/build-track-detail-rows'
import type { Track } from '@/types/track'

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

export default function LibraryBrowserView() {
  const {
    roots,
    libraryTracks,
    addToQueue,
    playNow,
    playNext,
    compactLists,
    isFavoriteSong,
    toggleFavoriteTrack,
    openTrackDetails,
    openRelatedSongs,
    openAddToPlaylist,
    downloadTrack,
    removeFromLibrary,
  } = useLibrary()

  const [selectedArtist, setSelectedArtist] = useState<string | null>(null)
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null)
  const [selectedSong, setSelectedSong] = useState<Track | null>(null)
  const [query, setQuery] = useState('')

  const [isNarrow, setIsNarrow] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(max-width: 1023px)')
    const apply = () => setIsNarrow(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  const compact = compactLists
  const ulSpaceYClass = compact ? 'space-y-0.25' : 'space-y-0.5'
  const rowPadLgClass = compact ? 'px-2 py-2' : 'px-3 py-2.5'

  const q = query.trim().toLowerCase()
  const tracksForView = useMemo(() => {
    if (!q) return libraryTracks
    return libraryTracks.filter((t) =>
      t.title.toLowerCase().includes(q) ||
      t.artist.toLowerCase().includes(q) ||
      t.album.toLowerCase().includes(q),
    )
  }, [libraryTracks, q])

  const artistMap = useMemo(() => groupByArtist(tracksForView), [tracksForView])

  const artistNames = useMemo(
    () =>
      [...artistMap.keys()].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
    [artistMap],
  )

  const albumMapForArtist = useMemo(() => {
    if (!selectedArtist) return new Map<string, Track[]>()
    const tracks = artistMap.get(selectedArtist) ?? []
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
  }, [selectedArtist, artistMap])

  const albumKeysForArtist = useMemo(
    () =>
      [...albumMapForArtist.keys()].sort((a, b) => {
        const [albumA] = a.split('\u0000')
        const [albumB] = b.split('\u0000')
        const c = albumA.localeCompare(albumB, undefined, { sensitivity: 'base' })
        if (c !== 0) return c
        const [, artistA] = a.split('\u0000')
        const [, artistB] = b.split('\u0000')
        return artistA.localeCompare(artistB, undefined, { sensitivity: 'base' })
      }),
    [albumMapForArtist],
  )

  const songsForAlbum = useMemo(() => {
    if (!selectedAlbum) return []
    return albumMapForArtist.get(selectedAlbum) ?? []
  }, [selectedAlbum, albumMapForArtist])

  useEffect(() => {
    if (selectedArtist && !artistMap.has(selectedArtist)) {
      setSelectedArtist(null)
      setSelectedAlbum(null)
      setSelectedSong(null)
    }
  }, [artistMap, selectedArtist])

  useEffect(() => {
    if (selectedAlbum && !albumMapForArtist.has(selectedAlbum)) {
      setSelectedAlbum(null)
      setSelectedSong(null)
    }
  }, [albumMapForArtist, selectedAlbum])

  useEffect(() => {
    if (selectedSong && !songsForAlbum.some((t) => t.id === selectedSong.id)) {
      setSelectedSong(null)
    }
  }, [songsForAlbum, selectedSong])

  const onAdd = useCallback((t: Track) => addToQueue(t), [addToQueue])

  const onAddMany = useCallback(
    (list: readonly Track[]) => {
      if (list.length === 0) return
      addToQueue(list)
    },
    [addToQueue],
  )

  const detailRows = useMemo(
    () => (selectedSong ? buildTrackDetailRows(selectedSong, roots) : []),
    [selectedSong, roots],
  )

  const detailSections = useMemo(() => {
    if (detailRows.length === 0) return []
    const editableFields = new Set(['Title', 'Artist', 'Album'])
    const editable = detailRows.filter((r) => editableFields.has(r.label))
    const rest = detailRows.filter((r) => !editableFields.has(r.label))
    const sections: { title: string; rows: typeof detailRows }[] = []
    if (editable.length > 0) sections.push({ title: 'Track info', rows: editable })
    if (rest.length > 0) sections.push({ title: 'Details', rows: rest })
    return sections
  }, [detailRows])

  const trackOverflowItems = useMemo(() => {
    if (!selectedSong) return []
    return buildTrackOverflowMenuItems({
      track: selectedSong,
      onViewDetails: openTrackDetails,
      onViewRelatedSongs: openRelatedSongs,
      onAddToPlaylist: (track) => openAddToPlaylist(track, track.title),
      onDownload: downloadTrack,
      onRemoveFromLibrary: () => removeFromLibrary(selectedSong),
    })
  }, [
    selectedSong,
    openTrackDetails,
    openRelatedSongs,
    openAddToPlaylist,
    downloadTrack,
    removeFromLibrary,
  ])

  const handleArtistClick = useCallback((name: string) => {
    setSelectedArtist((prev) => (prev === name ? null : name))
    setSelectedAlbum(null)
    setSelectedSong(null)
  }, [])

  const handleAlbumClick = useCallback((key: string) => {
    setSelectedAlbum((prev) => (prev === key ? null : key))
    setSelectedSong(null)
  }, [])

  const handleSongClick = useCallback((track: Track) => {
    setSelectedSong((prev) => (prev?.id === track.id ? null : track))
  }, [])

  const SongDetailsContent = ({ largeCover = false }: { largeCover?: boolean }) => {
    if (!selectedSong) return null

    const coverClass = largeCover
      ? 'h-48 w-48 sm:h-56 sm:w-56 rounded-2xl'
      : 'h-28 w-28 sm:h-36 sm:w-36 lg:h-48 lg:w-48 rounded-xl'

    return (
      <div className="space-y-4">
        <div className="flex justify-center">
          <AlbumCoverThumb
            track={selectedSong}
            className={`overflow-hidden ring-1 ring-zinc-200/80 dark:ring-zinc-700/80 ${coverClass}`}
          />
        </div>

        <div className="text-center">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 sm:text-lg">
            {selectedSong.title}
          </h3>
          <p className="mt-0.5 text-sm text-zinc-500">{selectedSong.artist}</p>
          <p className="text-sm text-zinc-500">{selectedSong.album}</p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <div
            className="inline-flex overflow-hidden rounded-full ring-1 ring-accent-500/40"
            role="group"
            aria-label="Play options"
          >
            <button
              type="button"
              onClick={() => playNow(selectedSong)}
              className="border-r border-accent-500/30 bg-accent-500 px-3 py-1 text-xs font-medium text-white transition hover:bg-accent-600 sm:px-4 sm:py-1.5"
            >
              Play
            </button>
            <button
              type="button"
              onClick={() => playNext(selectedSong)}
              className="bg-accent-500/15 px-3 py-1 text-xs font-medium text-accent-800 transition hover:bg-accent-500/25 dark:text-accent-300 sm:px-4 sm:py-1.5"
            >
              Play next
            </button>
          </div>
          <button
            type="button"
            onClick={() => onAdd(selectedSong)}
            className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 sm:px-4 sm:py-1.5"
          >
            Add to queue
          </button>
          <FavoriteStarButton
            filled={isFavoriteSong(selectedSong.id)}
            onPress={() => toggleFavoriteTrack(selectedSong)}
            label={
              isFavoriteSong(selectedSong.id)
                ? 'Remove song from favorites'
                : 'Add song to favorites'
            }
          />
          <TrackRowOverflowMenu
            triggerLabel={`Actions for ${selectedSong.title}`}
            items={trackOverflowItems}
          />
        </div>

        {selectedSong.durationSec > 0 ? (
          <div className="text-center text-sm text-zinc-500">
            Duration: {formatDuration(selectedSong.durationSec)}
          </div>
        ) : null}

        {detailSections.map((section) => (
          <section key={section.title}>
            <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              {section.title}
            </h3>
            <dl className="mt-2 divide-y divide-zinc-100 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
              {section.rows.map((row) => (
                <div
                  key={`${section.title}-${row.label}`}
                  className="grid px-3 py-1.5 sm:grid-cols-[5rem_1fr] sm:gap-3"
                >
                  <dt className="text-xs font-medium text-zinc-500">{row.label}</dt>
                  <dd
                    className={[
                      'text-sm break-words text-zinc-900 dark:text-zinc-100',
                      row.mono ? 'font-mono text-xs' : '',
                    ].join(' ')}
                  >
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    )
  }

  // On narrow screens (< ~1024px), upstream panels in the artist→album→song drilldown
  // collapse to compact "selected" bars. This frees vertical space so the current list
  // (or the details pane) can expand via flex-1 and show a useful number of items.
  const artistsCompact = isNarrow && !!selectedArtist
  const albumsCompact = isNarrow && !!selectedAlbum

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Search input for library browse (filters artist/album/song by name) */}
      <div className="shrink-0 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search artists, albums, or songs…"
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-900 shadow-sm outline-none ring-accent-500/0 transition focus:border-accent-400 focus:ring-2 focus:ring-accent-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-accent-500/60"
          aria-label="Search library"
        />
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row relative">
        {/* Artists column */}
        <div
          className={[
            'flex w-full min-w-0 flex-col overflow-hidden',
            artistsCompact ? 'flex-none' : 'flex-1',
            'lg:w-1/5 lg:border-r lg:border-zinc-200 lg:dark:border-zinc-800 lg:flex-none',
          ].join(' ')}
        >
        <div className="flex h-10 shrink-0 items-center border-b border-zinc-200 px-3 dark:border-zinc-800 lg:h-11">
          <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">Artists</h2>
        </div>
        {artistsCompact ? (
          <button
            type="button"
            onClick={() => {
              setSelectedArtist(null)
              setSelectedAlbum(null)
              setSelectedSong(null)
            }}
            className="flex shrink-0 items-center justify-between gap-2 border-t border-zinc-200 bg-zinc-50 px-3 py-2 text-left text-sm active:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/50 dark:active:bg-zinc-800"
          >
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase tracking-wider text-zinc-500">Artist</div>
              <div className="truncate font-medium text-zinc-900 dark:text-zinc-100">{selectedArtist}</div>
            </div>
            <span className="text-xs text-accent-600 dark:text-accent-400">Change</span>
          </button>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto px-1.5 py-1.5">
            {artistNames.length === 0 ? (
              <p className="px-2 py-4 text-center text-sm text-zinc-500">No artists found</p>
            ) : (
              <ul className={ulSpaceYClass}>
                {artistNames.map((name) => (
                  <li key={name}>
                    <button
                      type="button"
                      onClick={() => handleArtistClick(name)}
                      className={[
                        'flex w-full items-center justify-between rounded-lg text-left text-sm transition',
                        rowPadLgClass,
                        name === selectedArtist
                          ? 'bg-accent-500/15 text-accent-800 dark:text-accent-300'
                          : 'text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800/80',
                      ].join(' ')}
                    >
                      <span className="min-w-0 flex-1 truncate font-medium">{name}</span>
                      <span className="shrink-0 pl-2 text-xs tabular-nums text-zinc-500">
                        {artistMap.get(name)?.length ?? 0}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Albums column */}
      <div
        className={[
          'flex w-full min-w-0 flex-col overflow-hidden',
          albumsCompact ? 'flex-none' : selectedArtist ? 'flex-1' : 'flex-none',
          'lg:w-1/5 lg:border-r lg:border-zinc-200 lg:dark:border-zinc-800 lg:flex-none',
        ].join(' ')}
      >
        <div className="flex h-10 shrink-0 items-center border-b border-zinc-200 px-3 dark:border-zinc-800 lg:h-11">
          <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">Albums</h2>
        </div>
        {albumsCompact ? (
          <button
            type="button"
            onClick={() => {
              setSelectedAlbum(null)
              setSelectedSong(null)
            }}
            className="flex shrink-0 items-center justify-between gap-2 border-t border-zinc-200 bg-zinc-50 px-3 py-2 text-left text-sm active:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/50 dark:active:bg-zinc-800"
          >
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase tracking-wider text-zinc-500">Album</div>
              <div className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                {selectedAlbum?.split('\u0000')[0]}
              </div>
            </div>
            <span className="text-xs text-accent-600 dark:text-accent-400">Change</span>
          </button>
        ) : selectedArtist ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-1.5 py-1.5">
            {albumKeysForArtist.length === 0 ? (
              <p className="px-2 py-4 text-center text-sm text-zinc-500">No albums found</p>
            ) : (
              <ul className={ulSpaceYClass}>
                {albumKeysForArtist.map((key) => {
                  const tracks = albumMapForArtist.get(key) ?? []
                  const [album, artist] = key.split('\u0000')
                  const sample = tracks[0]
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        onClick={() => handleAlbumClick(key)}
                        className={[
                          'flex w-full items-center gap-2 rounded-lg text-left transition',
                          rowPadLgClass,
                          key === selectedAlbum
                            ? 'bg-accent-500/15'
                            : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/80',
                        ].join(' ')}
                      >
                        <AlbumCoverThumb
                          track={sample}
                          className="h-9 w-9 shrink-0 overflow-hidden rounded-md ring-1 ring-zinc-200/80 dark:ring-zinc-700/80 lg:h-10 lg:w-10"
                        />
                        <div className="min-w-0 flex-1">
                          <span
                            className={[
                              'block truncate text-sm font-medium',
                              key === selectedAlbum
                                ? 'text-accent-800 dark:text-accent-300'
                                : 'text-zinc-900 dark:text-zinc-100',
                            ].join(' ')}
                          >
                            {album}
                          </span>
                          <span className="block truncate text-xs text-zinc-500">{artist}</span>
                          <span className="mt-0.5 text-xs text-zinc-400">
                            {tracks.length} track{tracks.length === 1 ? '' : 's'}
                          </span>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        ) : isNarrow ? null : (
          <p className="px-2 py-4 text-center text-sm text-zinc-500">Select an artist</p>
        )}
      </div>

      {/* Songs column */}
      <div
        className={[
          'flex w-full min-w-0 flex-col overflow-hidden',
          selectedAlbum ? 'flex-1' : 'flex-none',
          'lg:w-1/5 lg:border-r lg:border-zinc-200 lg:dark:border-zinc-800 lg:flex-none',
        ].join(' ')}
      >
        <div className="flex h-10 shrink-0 items-center border-b border-zinc-200 px-3 dark:border-zinc-800 lg:h-11">
          <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">Songs</h2>
        </div>
        {!selectedAlbum ? (
          isNarrow ? null : (
            <p className="px-2 py-4 text-center text-sm text-zinc-500">Select an album</p>
          )
        ) : songsForAlbum.length === 0 ? (
          <p className="px-2 py-4 text-center text-sm text-zinc-500">No songs found</p>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto px-1.5 py-1.5">
            <>
              <button
                type="button"
                onClick={() => onAddMany(songsForAlbum)}
                className="mb-2 w-full rounded-lg border border-zinc-200 bg-white py-2 text-xs font-medium text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Add all to queue
              </button>
              <ul className={ulSpaceYClass}>
                {songsForAlbum.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => handleSongClick(t)}
                      className={[
                        'flex w-full items-center justify-between rounded-lg text-left text-sm transition',
                        rowPadLgClass,
                        selectedSong?.id === t.id
                          ? 'bg-accent-500/15 text-accent-800 dark:text-accent-300'
                          : 'text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800/80',
                      ].join(' ')}
                    >
                      <span className="min-w-0 flex-1 truncate font-medium">{t.title}</span>
                      <span className="shrink-0 pl-2 text-xs tabular-nums text-zinc-500">
                        {t.durationSec > 0 ? formatDuration(t.durationSec) : '—'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          </div>
        )}
      </div>

      {/* Details sidebar */}
      <div
        className={[
          'flex w-full min-w-0 flex-col overflow-hidden',
          isNarrow && selectedSong ? 'hidden' : selectedSong ? 'flex-1' : 'flex-none',
          'lg:w-2/5 lg:flex-none',
        ].join(' ')}
      >
        <div className="flex h-10 shrink-0 items-center border-b border-zinc-200 px-3 dark:border-zinc-800 lg:h-11">
          <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">Song details</h2>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {!selectedSong ? (
            isNarrow ? null : (
              <p className="py-4 text-center text-sm text-zinc-500">Select a song</p>
            )
          ) : isNarrow && selectedSong ? null : (
            <SongDetailsContent largeCover={false} />
          )}
        </div>
      </div>

        {isNarrow && selectedSong && (
          <div className="absolute inset-0 z-50 flex flex-col bg-zinc-100 dark:bg-zinc-950 overflow-hidden">
            <div className="flex h-11 shrink-0 items-center justify-between border-b border-zinc-200 bg-white/90 px-3 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/90">
              <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">Song details</h2>
              <button
                type="button"
                onClick={() => setSelectedSong(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                aria-label="Close details"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                  aria-hidden
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <SongDetailsContent key={selectedSong.id} largeCover />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
