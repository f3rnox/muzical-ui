'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import appendRecentBrowseSearch from '@/lib/browse/append-recent-browse-search'
import { RECENT_BROWSE_SEARCHES_LIMIT } from '@/lib/browse/browse-search-constants'
import readStoredRecentBrowseSearches from '@/lib/browse/read-stored-recent-browse-searches'
import clearStoredRecentBrowseSearches from '@/lib/browse/clear-stored-recent-browse-searches'
import writeStoredRecentBrowseSearches from '@/lib/browse/write-stored-recent-browse-searches'
import type { BrowseSearchSource, RecentBrowseSearch } from '@/types/browse-search'
import type { Track } from '@/types/track'
import type { QueuedTrack } from '@/types/queue'
import {
  idbDeleteRoot,
  idbGetAllRoots,
  idbGetCatalog,
  idbGetFavorites,
  idbPutCatalog,
  idbPutFavorites,
  idbPutRoot,
  openLibraryDb,
  type StoredLibraryRoot,
} from '@/lib/library/idb'
import { formatFsAccessErrorMessage } from '@/lib/library/format-fs-access-error'
import { collectTracksForMeta } from '@/lib/library/collect-tracks-for-meta'
import { scanProgressLabel } from '@/lib/library/scan-progress-label'
import { scanProgressPercent } from '@/lib/library/scan-progress-percent'
import type { ScanProgressTick } from '@/lib/library/scan-progress-tick'
import extractPersistedLibraryTracks from '@/lib/library/extract-persisted-library-tracks'
import filterOutPersistedLibraryTracks from '@/lib/library/filter-out-persisted-library-tracks'
import { albumCompositeKey, artistDisplayName } from '@/lib/library/favorite-keys'
import tracksMatchingAlbumKey from '@/lib/library/tracks-matching-album-key'
import tracksMatchingArtistName from '@/lib/library/tracks-matching-artist-name'
import applyAlbumMetadataPatch from '@/lib/track/apply-album-metadata-patch'
import type { AlbumMetadataFields } from '@/lib/track/apply-album-metadata-patch'
import applyArtistMetadataPatch from '@/lib/track/apply-artist-metadata-patch'
import type { ArtistMetadataFields } from '@/lib/track/apply-artist-metadata-patch'
import applyTrackMetadataPatch from '@/lib/track/apply-track-metadata-patch'
import type { TrackMetadataFields } from '@/lib/track/apply-track-metadata-patch'
import writeAudioTagsToFile from '@/lib/library/write-audio-tags-to-file'
import writeAudioTagsToTracks from '@/lib/library/write-audio-tags-to-tracks'
import type {
  WriteAudioTagsBulkResult,
  WriteAudioTagsResult,
} from '@/types/write-audio-tags-result'
import isPersistedLibraryTrack from '@/lib/library/is-persisted-library-track'
import mergeScannedTracksWithSavedLibrary from '@/lib/library/merge-scanned-tracks-with-saved-library'
import normalizeTrackForLibrarySave from '@/lib/library/normalize-track-for-library-save'
import parsePersistedCatalogTracks from '@/lib/library/parse-persisted-catalog-tracks'
import { resolveTrackToFile } from '@/lib/library/resolve-track-file'
import AddToPlaylistDialog from '@/components/AddToPlaylistDialog'
import LibraryScanNotification from '@/components/LibraryScanNotification'
import RelatedSongsDialog from '@/components/RelatedSongsDialog'
import TrackDetailsDialog from '@/components/TrackDetailsDialog'
import type { LibraryRootMeta } from '@/types/library-root-meta'
import type { LibraryScanProgress } from '@/types/library-scan-progress'
import type { LibraryScanPreferences } from '@/types/library-scan-preferences'
import readStoredLibraryScanPreferences from '@/lib/library/read-stored-library-scan-preferences'
import writeStoredLibraryScanPreferences from '@/lib/library/write-stored-library-scan-preferences'
import scanPreferencesToTreeOptions from '@/lib/library/scan-preferences-to-tree-options'
import readStoredPlaylists from '@/lib/playlists/read-stored-playlists'
import writeStoredPlaylists from '@/lib/playlists/write-stored-playlists'
import generatePlaylistId from '@/lib/playlists/generate-playlist-id'
import normalizePlaylistName from '@/lib/playlists/normalize-playlist-name'
import appendTrackIdsToPlaylist from '@/lib/playlists/append-track-ids-to-playlist'
import removeTrackIdsFromPlaylist from '@/lib/playlists/remove-track-ids-from-playlist'
import reorderPlaylistTrackIds from '@/lib/playlists/reorder-playlist-track-ids'
import { PLAYLISTS_LIMIT } from '@/lib/playlists/playlist-storage-key'
import type { Playlist } from '@/types/playlist'
import type { ListeningStatsByTrackId } from '@/types/listening-stats'
import {
  clearStoredListeningStats,
  readStoredListeningStats,
  writeStoredListeningStats,
} from '@/lib/listening/listening-stats-storage'
import readStoredPlaybackSnapshot from '@/lib/playback/read-stored-playback-snapshot'
import writeStoredPlaybackSnapshot from '@/lib/playback/write-stored-playback-snapshot'
import buildEmptyPlaybackSnapshot from '@/lib/playback/build-empty-playback-snapshot'
import buildQueueFromSnapshot from '@/lib/playback/build-queue-from-snapshot'
import collectYoutubePrefetchTargets from '@/lib/youtube/collect-youtube-prefetch-targets'
import prefetchYoutubeVideoIds from '@/lib/youtube/prefetch-youtube-video-ids'
import readYoutubeDataApiBlocked from '@/lib/youtube/read-youtube-data-api-blocked'
import { useYoutubePreferences } from '@/components/YoutubePreferencesProvider'

export type { LibraryRootMeta } from '@/types/library-root-meta'
export type { LibraryScanPreferences } from '@/types/library-scan-preferences'
export type { Playlist } from '@/types/playlist'

export type PlaybackRestore = {
  activeQueueId: string | null
  positionSec: number
}

export type PlayNowRequest = {
  activeQueueId: string
}

type LibraryContextValue = {
  roots: LibraryRootMeta[]
  /** Full catalog from scans — not the playback queue */
  libraryTracks: Track[]
  queue: QueuedTrack[]
  recentlyPlayedTrackIds: readonly string[]
  listeningStats: ListeningStatsByTrackId
  recentBrowseSearches: readonly RecentBrowseSearch[]
  compactLists: boolean
  autoRescanOnStartup: boolean
  logLibraryScanTiming: boolean
  scanPreferences: LibraryScanPreferences
  rememberLastQueue: boolean
  playbackRestore: PlaybackRestore | null
  playNowRequest: PlayNowRequest | null
  isQueueReady: boolean
  isScanning: boolean
  youtubePrefetchActive: boolean
  youtubePrefetchVideoCount: number
  beginYoutubePrefetch: (videoCount: number) => void
  endYoutubePrefetch: (videoCount: number) => void
  scanError: string | null
  hasDirectoryPicker: boolean
  addLibraryFolder: () => void
  removeLibraryFolder: (id: string) => Promise<void>
  rescanAll: () => Promise<void>
  addToQueue: (items: Track | readonly Track[]) => void
  playNow: (items: Track | readonly Track[]) => void
  addToLibrary: (items: Track | readonly Track[]) => void
  removeFromLibrary: (items: Track | readonly Track[]) => void
  removeAlbumFromLibrary: (albumKey: string) => void
  removeArtistFromLibrary: (artistName: string) => void
  removeAllMusicBrainzFromLibrary: () => void
  removeFromQueue: (queueId: string) => void
  clearQueue: () => void
  recordRecentlyPlayedTrack: (trackId: string) => void
  recordTrackPlaybackStarted: (trackId: string) => void
  recordTrackPlaybackProgress: (trackId: string, listenedSec: number) => void
  recordTrackPlaybackCompleted: (trackId: string) => void
  recordTrackSkipped: (trackId: string) => void
  clearListeningStats: () => void
  recordRecentBrowseSearch: (source: BrowseSearchSource, query: string) => void
  clearRecentBrowseSearches: () => void
  setCompactLists: (next: boolean) => void
  setAutoRescanOnStartup: (next: boolean) => void
  setLogLibraryScanTiming: (next: boolean) => void
  setScanPreferences: (next: LibraryScanPreferences) => void
  setRememberLastQueue: (next: boolean) => void
  consumePlaybackRestore: () => void
  consumePlayNowRequest: () => void
  reportPlayback: (activeQueueId: string | null, positionSec: number) => void
  reorderQueueItems: (fromIndex: number, toIndex: number) => void
  resolveFileForTrack: (track: Track) => Promise<File | null>
  bumpTrackDuration: (trackId: string, durationSec: number) => void
  patchTrackById: (trackId: string, patch: (track: Track) => Track) => void
  saveTrackMetadata: (trackId: string, fields: TrackMetadataFields) => Promise<WriteAudioTagsResult>
  writeLibraryTracksToFiles: (tracks: readonly Track[]) => Promise<WriteAudioTagsBulkResult>
  patchAlbumMetadataByKey: (albumKey: string, fields: AlbumMetadataFields) => string | null
  patchArtistMetadataByKey: (artistName: string, fields: ArtistMetadataFields) => string | null
  favoriteSongIds: readonly string[]
  favoriteArtistNames: readonly string[]
  favoriteAlbumKeys: readonly string[]
  isFavoriteSong: (trackId: string) => boolean
  isFavoriteArtist: (name: string) => boolean
  isFavoriteAlbum: (albumKey: string) => boolean
  toggleFavoriteSong: (trackId: string) => void
  toggleFavoriteArtist: (name: string) => void
  toggleFavoriteAlbum: (albumKey: string) => void
  toggleFavoriteTrack: (track: Track) => void
  importFavorites: (data: {
    songIds: readonly string[]
    artistNames: readonly string[]
    albumKeys: readonly string[]
  }) => void
  detailsTrack: Track | null
  openTrackDetails: (track: Track) => void
  closeTrackDetails: () => void
  relatedSongsSeedTrack: Track | null
  openRelatedSongs: (track: Track) => void
  closeRelatedSongs: () => void
  playlists: readonly Playlist[]
  createPlaylist: (name: string, initialTrackIds?: readonly string[]) => Playlist | null
  renamePlaylist: (playlistId: string, name: string) => boolean
  deletePlaylist: (playlistId: string) => void
  addTracksToPlaylist: (playlistId: string, tracks: Track | readonly Track[]) => number
  removeTracksFromPlaylist: (playlistId: string, trackIds: readonly string[]) => void
  reorderPlaylistTracks: (playlistId: string, fromIndex: number, toIndex: number) => void
  openAddToPlaylist: (tracks: Track | readonly Track[], contextLabel: string) => void
}

const LibraryContext = createContext<LibraryContextValue | null>(null)

const STORAGE_RECENTLY_PLAYED_TRACK_IDS = 'muzical.recentlyPlayedTrackIds'
const RECENTLY_PLAYED_LIMIT = 24
const STORAGE_COMPACT_LISTS = 'muzical.compactLists'
const STORAGE_AUTO_RESCAN_ON_STARTUP = 'muzical.autoRescanOnStartup'
const STORAGE_LOG_LIBRARY_SCAN_TIMING = 'muzical.logLibraryScanTiming'
const STORAGE_REMEMBER_LAST_QUEUE = 'muzical.rememberLastQueue'

function trackArrayFromInput(items: Track | readonly Track[]): Track[] {
  return Array.isArray(items) ? [...items] : [items as Track]
}

function safeReadStoredBoolean(key: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return false
    const parsed: unknown = JSON.parse(raw)
    return parsed === true
  } catch {
    return false
  }
}

function safeReadStoredBooleanOrDefault(key: string, defaultValue: boolean): boolean {
  if (typeof window === 'undefined') return defaultValue
  try {
    const raw = window.localStorage.getItem(key)
    if (raw === null) return defaultValue
    const parsed: unknown = JSON.parse(raw)
    return parsed === true
  } catch {
    return defaultValue
  }
}

function safeWriteStoredBoolean(key: string, value: boolean): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}

function toggleSortedStringId(prev: readonly string[], id: string): string[] {
  const next = new Set(prev)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return [...next].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
}

function safeReadStoredStringArray(key: string): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((x): x is string => typeof x === 'string')
  } catch {
    return []
  }
}

function safeWriteStoredStringArray(key: string, list: readonly string[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(list))
  } catch {
    /* ignore */
  }
}

function catalogMatchesRoots(
  meta: readonly { id: string }[],
  cachedRootIds: readonly string[],
): boolean {
  if (meta.length !== cachedRootIds.length) return false
  const sorted = [...meta]
    .map((m) => m.id)
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  return sorted.every((id, i) => id === cachedRootIds[i])
}

const DISK_ACCESS_HINT =
  'Use Rescan all in Settings → Library, or remove and add the folders again so the browser can access your music.'

const SCAN_NOTIFICATION_DISMISS_MS = 4000

/**
 * True when every configured root already has persisted read access (no prompt on scan).
 */
async function everyHandleHasGrantedReadAccess(
  handles: ReadonlyMap<string, FileSystemDirectoryHandle>,
): Promise<boolean> {
  if (handles.size === 0) return false
  const opts = { mode: 'read' as const }
  for (const h of handles.values()) {
    try {
      const q = await h.queryPermission?.(opts)
      if (q !== 'granted') return false
    } catch {
      return false
    }
  }
  return true
}

/**
 * Checks read permission on handles. Only passes `mayRequestPrompt: true` from a user gesture
 * (Rescan, first pointer retry); cold load uses `false` so Chrome does not re-show the allow
 * dialog on every refresh when access is already persisted.
 */
async function reconfirmReadAccessForHandles(
  handles: ReadonlyMap<string, FileSystemDirectoryHandle>,
  mayRequestPrompt: boolean,
): Promise<void> {
  const opts = { mode: 'read' as const }
  for (const h of handles.values()) {
    try {
      const q = await h.queryPermission?.(opts)
      if (q === 'granted') continue
      if (!mayRequestPrompt) continue
      await h.requestPermission?.(opts)
    } catch {
      /* ignore — scan will surface real failure */
    }
  }
}

/**
 * Persists library folder handles, scans audio files, and exposes tracks for the player.
 */
export function LibraryProvider(props: { children: ReactNode }) {
  const { preferences: youtubePreferences } = useYoutubePreferences()
  const dbRef = useRef<IDBDatabase | null>(null)
  const scanLockRef = useRef(false)
  const rootHandlesRef = useRef<Map<string, FileSystemDirectoryHandle>>(new Map())
  const rootsMetaRef = useRef<LibraryRootMeta[]>([])
  const libraryTracksRef = useRef<Track[]>([])
  const persistCatalogTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scanDismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const favoritesReadyRef = useRef(false)
  const recentBrowseSearchesReadyRef = useRef(false)
  const scanPrefsRef = useRef<LibraryScanPreferences>(readStoredLibraryScanPreferences())
  const logLibraryScanTimingRef = useRef(false)
  const rememberLastQueueRef = useRef(false)
  const queueHydratedRef = useRef(false)
  const playbackReportRef = useRef({
    activeQueueId: null as string | null,
    positionSec: 0,
  })
  const persistPlaybackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const listeningStatsReadyRef = useRef(false)
  const [favoriteSongIds, setFavoriteSongIds] = useState<string[]>([])
  const [favoriteArtistNames, setFavoriteArtistNames] = useState<string[]>([])
  const [favoriteAlbumKeys, setFavoriteAlbumKeys] = useState<string[]>([])
  const [roots, setRoots] = useState<LibraryRootMeta[]>([])
  const [libraryTracks, setLibraryTracks] = useState<Track[]>([])
  const [queue, setQueue] = useState<QueuedTrack[]>([])
  const [recentlyPlayedTrackIds, setRecentlyPlayedTrackIds] = useState<string[]>([])
  const [listeningStats, setListeningStats] = useState<ListeningStatsByTrackId>({})
  const [recentBrowseSearches, setRecentBrowseSearches] = useState<RecentBrowseSearch[]>([])
  const [compactLists, setCompactListsState] = useState(false)
  const [autoRescanOnStartup, setAutoRescanOnStartupState] = useState(true)
  const [logLibraryScanTiming, setLogLibraryScanTimingState] = useState(false)
  const [scanPreferences, setScanPreferencesState] = useState<LibraryScanPreferences>(
    readStoredLibraryScanPreferences,
  )
  const [rememberLastQueue, setRememberLastQueueState] = useState(false)
  const [playbackRestore, setPlaybackRestore] = useState<PlaybackRestore | null>(null)
  const [playNowRequest, setPlayNowRequest] = useState<PlayNowRequest | null>(null)
  const [catalogInitDone, setCatalogInitDone] = useState(false)
  const [isQueueReady, setIsQueueReady] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState<LibraryScanProgress | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)
  const [hasDirectoryPicker, setHasDirectoryPicker] = useState(false)
  const [detailsTrack, setDetailsTrack] = useState<Track | null>(null)
  const [relatedSongsSeedTrack, setRelatedSongsSeedTrack] = useState<Track | null>(null)
  const [youtubePrefetchActive, setYoutubePrefetchActive] = useState(false)
  const [youtubePrefetchVideoCount, setYoutubePrefetchVideoCount] = useState(0)
  const youtubePrefetchVideosRef = useRef(0)
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const playlistsReadyRef = useRef(false)
  const [addToPlaylistTarget, setAddToPlaylistTarget] = useState<{
    tracks: readonly Track[]
    contextLabel: string
  } | null>(null)

  const beginYoutubePrefetch = useCallback((videoCount: number) => {
    const n = Math.max(0, Math.floor(videoCount))
    if (n === 0) return
    youtubePrefetchVideosRef.current += n
    setYoutubePrefetchVideoCount(youtubePrefetchVideosRef.current)
    setYoutubePrefetchActive(true)
  }, [])

  const endYoutubePrefetch = useCallback((videoCount: number) => {
    const n = Math.max(0, Math.floor(videoCount))
    youtubePrefetchVideosRef.current = Math.max(0, youtubePrefetchVideosRef.current - n)
    setYoutubePrefetchVideoCount(youtubePrefetchVideosRef.current)
    if (youtubePrefetchVideosRef.current === 0) {
      setYoutubePrefetchActive(false)
    }
  }, [])

  useEffect(() => {
    void Promise.resolve().then(() => {
      setHasDirectoryPicker(typeof window !== 'undefined' && 'showDirectoryPicker' in window)
    })
  }, [])

  useEffect(() => {
    void Promise.resolve().then(() => {
      setRecentlyPlayedTrackIds(
        safeReadStoredStringArray(STORAGE_RECENTLY_PLAYED_TRACK_IDS).slice(
          0,
          RECENTLY_PLAYED_LIMIT,
        ),
      )
    })
  }, [])

  useEffect(() => {
    void Promise.resolve().then(() => {
      setListeningStats(readStoredListeningStats())
      listeningStatsReadyRef.current = true
    })
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      setRecentBrowseSearches(
        readStoredRecentBrowseSearches().slice(0, RECENT_BROWSE_SEARCHES_LIMIT),
      )
      recentBrowseSearchesReadyRef.current = true
    })
  }, [])

  useEffect(() => {
    void Promise.resolve().then(() => {
      setCompactListsState(safeReadStoredBoolean(STORAGE_COMPACT_LISTS))
    })
  }, [])

  useEffect(() => {
    void Promise.resolve().then(() => {
      setAutoRescanOnStartupState(
        safeReadStoredBooleanOrDefault(STORAGE_AUTO_RESCAN_ON_STARTUP, true),
      )
    })
  }, [])

  useEffect(() => {
    void Promise.resolve().then(() => {
      const enabled = safeReadStoredBoolean(STORAGE_LOG_LIBRARY_SCAN_TIMING)
      setLogLibraryScanTimingState(enabled)
      logLibraryScanTimingRef.current = enabled
    })
  }, [])

  useEffect(() => {
    void Promise.resolve().then(() => {
      const prefs = readStoredLibraryScanPreferences()
      scanPrefsRef.current = prefs
      setScanPreferencesState(prefs)
    })
  }, [])

  useEffect(() => {
    void Promise.resolve().then(() => {
      const on = safeReadStoredBoolean(STORAGE_REMEMBER_LAST_QUEUE)
      rememberLastQueueRef.current = on
      setRememberLastQueueState(on)
    })
  }, [])

  useEffect(() => {
    safeWriteStoredStringArray(
      STORAGE_RECENTLY_PLAYED_TRACK_IDS,
      recentlyPlayedTrackIds.slice(0, RECENTLY_PLAYED_LIMIT),
    )
  }, [recentlyPlayedTrackIds])

  useEffect(() => {
    if (!listeningStatsReadyRef.current) return
    writeStoredListeningStats(listeningStats)
  }, [listeningStats])

  useEffect(() => {
    if (!recentBrowseSearchesReadyRef.current) return
    writeStoredRecentBrowseSearches(recentBrowseSearches.slice(0, RECENT_BROWSE_SEARCHES_LIMIT))
  }, [recentBrowseSearches])

  useEffect(() => {
    queueMicrotask(() => {
      setPlaylists(readStoredPlaylists())
      playlistsReadyRef.current = true
    })
  }, [])

  useEffect(() => {
    if (!playlistsReadyRef.current) return
    writeStoredPlaylists(playlists)
  }, [playlists])

  useEffect(() => {
    libraryTracksRef.current = libraryTracks
  }, [libraryTracks])

  useEffect(() => {
    return (): void => {
      if (persistCatalogTimerRef.current) {
        clearTimeout(persistCatalogTimerRef.current)
        persistCatalogTimerRef.current = null
      }
      if (scanDismissTimerRef.current) {
        clearTimeout(scanDismissTimerRef.current)
        scanDismissTimerRef.current = null
      }
      if (persistPlaybackTimerRef.current) {
        clearTimeout(persistPlaybackTimerRef.current)
        persistPlaybackTimerRef.current = null
      }
    }
  }, [])

  const flushPersistPlaybackNow = useCallback((): void => {
    if (!rememberLastQueueRef.current) return
    if (persistPlaybackTimerRef.current) {
      clearTimeout(persistPlaybackTimerRef.current)
      persistPlaybackTimerRef.current = null
    }
    const q = queue
    if (q.length === 0) {
      writeStoredPlaybackSnapshot(buildEmptyPlaybackSnapshot())
      return
    }
    const activeId = playbackReportRef.current.activeQueueId
    const activeRow = activeId ? q.find((row) => row.queueId === activeId) : q[0]
    writeStoredPlaybackSnapshot({
      trackIds: q.map((row) => row.track.id),
      tracks: q.map((row) => row.track),
      activeTrackId: activeRow?.track.id ?? null,
      positionSec: playbackReportRef.current.positionSec,
    })
  }, [queue])

  const persistPlaybackDebounced = useCallback((): void => {
    if (!rememberLastQueueRef.current) return
    if (!queueHydratedRef.current) return
    if (persistPlaybackTimerRef.current) clearTimeout(persistPlaybackTimerRef.current)
    persistPlaybackTimerRef.current = setTimeout(() => {
      persistPlaybackTimerRef.current = null
      flushPersistPlaybackNow()
    }, 400)
  }, [flushPersistPlaybackNow])

  const hydrateQueueFromStorage = useCallback((tracks: readonly Track[]): void => {
    if (queueHydratedRef.current) return
    queueHydratedRef.current = true
    if (rememberLastQueueRef.current) {
      const snap = readStoredPlaybackSnapshot()
      if (snap && snap.trackIds.length > 0) {
        const restored = buildQueueFromSnapshot(tracks, snap)
        if (restored.queue.length > 0) {
          let applied = false
          setQueue((prev) => {
            if (prev.length > 0) return prev
            applied = true
            return restored.queue
          })
          if (applied) {
            playbackReportRef.current = {
              activeQueueId: restored.activeQueueId,
              positionSec: restored.positionSec,
            }
            setPlaybackRestore({
              activeQueueId: restored.activeQueueId,
              positionSec: restored.positionSec,
            })
          }
        }
      }
    }
    setIsQueueReady(true)
  }, [])

  useEffect(() => {
    if (!queueHydratedRef.current) return
    const byId = new Map(libraryTracks.map((t) => [t.id, t]))
    setQueue((prev) =>
      prev.map((row) => {
        const catalog = byId.get(row.track.id)
        return catalog ? { ...row, track: catalog } : row
      }),
    )
  }, [libraryTracks])

  useEffect(() => {
    persistPlaybackDebounced()
  }, [queue, persistPlaybackDebounced])

  useEffect(() => {
    if (!catalogInitDone) return
    if (queueHydratedRef.current) return
    hydrateQueueFromStorage(libraryTracks)
  }, [catalogInitDone, libraryTracks, hydrateQueueFromStorage])

  useEffect(() => {
    const onPageHide = (): void => {
      flushPersistPlaybackNow()
    }
    window.addEventListener('pagehide', onPageHide)
    return (): void => {
      window.removeEventListener('pagehide', onPageHide)
    }
  }, [flushPersistPlaybackNow])

  const flushPersistCatalogNow = useCallback((): void => {
    if (persistCatalogTimerRef.current) {
      clearTimeout(persistCatalogTimerRef.current)
      persistCatalogTimerRef.current = null
    }
    const db = dbRef.current
    if (!db) return
    const meta = rootsMetaRef.current
    void idbPutCatalog(
      db,
      meta.map((r) => r.id),
      libraryTracksRef.current,
    ).catch(() => {
      /* ignore */
    })
  }, [])

  const persistCatalogDebounced = useCallback((): void => {
    if (persistCatalogTimerRef.current) {
      clearTimeout(persistCatalogTimerRef.current)
    }
    persistCatalogTimerRef.current = setTimeout(() => {
      persistCatalogTimerRef.current = null
      flushPersistCatalogNow()
    }, 450)
  }, [flushPersistCatalogNow])

  useEffect(() => {
    const onPageHide = (): void => {
      flushPersistCatalogNow()
    }
    window.addEventListener('pagehide', onPageHide)
    return (): void => {
      window.removeEventListener('pagehide', onPageHide)
    }
  }, [flushPersistCatalogNow])

  const clearScanDismissTimer = useCallback((): void => {
    if (scanDismissTimerRef.current) {
      clearTimeout(scanDismissTimerRef.current)
      scanDismissTimerRef.current = null
    }
  }, [])

  const scheduleScanDismiss = useCallback((): void => {
    clearScanDismissTimer()
    scanDismissTimerRef.current = setTimeout(() => {
      scanDismissTimerRef.current = null
      setScanProgress(null)
    }, SCAN_NOTIFICATION_DISMISS_MS)
  }, [clearScanDismissTimer])

  const dismissScanNotification = useCallback((): void => {
    clearScanDismissTimer()
    setScanProgress(null)
  }, [clearScanDismissTimer])

  const applyScanProgressTick = useCallback((tick: ScanProgressTick): void => {
    setScanProgress({
      percent: scanProgressPercent(tick),
      label: scanProgressLabel(tick),
      rootName: tick.rootName,
      filesDone: tick.filesDone ?? 0,
      filesTotal: tick.filesTotal ?? 0,
    })
  }, [])

  const performScan = useCallback(
    async (withUserActivation: boolean) => {
      if (scanLockRef.current) return null
      scanLockRef.current = true
      const meta = rootsMetaRef.current
      const map = rootHandlesRef.current
      clearScanDismissTimer()
      setIsScanning(true)
      setScanError(null)
      setScanProgress({
        percent: 0,
        label: 'Starting library scan…',
        rootName: null,
        filesDone: 0,
        filesTotal: 0,
      })
      try {
        if (meta.length > 0) {
          await reconfirmReadAccessForHandles(map, withUserActivation)
        }
        const treeOpts = scanPreferencesToTreeOptions(scanPrefsRef.current)
        const result = await collectTracksForMeta(
          meta,
          map,
          treeOpts,
          libraryTracksRef.current,
          logLibraryScanTimingRef.current,
          applyScanProgressTick,
        )
        setScanProgress({
          percent: 100,
          label:
            result.tracks.length > 0
              ? `Found ${result.tracks.length} track${result.tracks.length === 1 ? '' : 's'}`
              : 'Scan complete',
          rootName: null,
          filesDone: result.tracks.length,
          filesTotal: result.tracks.length,
        })
        scheduleScanDismiss()
        return result
      } catch (e) {
        setScanProgress(null)
        setScanError(e instanceof Error ? e.message : 'Scan failed')
        return null
      } finally {
        scanLockRef.current = false
        setIsScanning(false)
      }
    },
    [applyScanProgressTick, clearScanDismissTimer, scheduleScanDismiss],
  )

  const runScan = useCallback(
    async (withUserActivation = false): Promise<void> => {
      const result = await performScan(withUserActivation)
      if (!result) return
      const meta = rootsMetaRef.current
      const { tracks: next, failedRootCount, firstError } = result
      const merged = mergeScannedTracksWithSavedLibrary(next, libraryTracksRef.current)
      setLibraryTracks(merged)
      const db = dbRef.current
      if (db) {
        try {
          await idbPutCatalog(
            db,
            meta.map((r) => r.id),
            merged,
          )
        } catch {
          /* quota or transient IDB errors — in-memory catalog still updated */
        }
      }
      if (withUserActivation && failedRootCount > 0 && next.length === 0 && meta.length > 0) {
        setScanError(firstError ? `${firstError} ${DISK_ACCESS_HINT}` : DISK_ACCESS_HINT)
      }
    },
    [performScan],
  )

  const bumpTrackDuration = useCallback(
    (trackId: string, durationSec: number) => {
      if (!Number.isFinite(durationSec) || durationSec <= 0) return
      const patch = (t: Track): Track =>
        t.id === trackId && t.durationSec <= 0 ? { ...t, durationSec } : t
      setLibraryTracks((prev) => prev.map(patch))
      setQueue((prev) => prev.map((q) => ({ ...q, track: patch(q.track) })))
      persistCatalogDebounced()
    },
    [persistCatalogDebounced],
  )

  const patchTrackById = useCallback(
    (trackId: string, patch: (track: Track) => Track) => {
      const id = trackId.trim()
      if (!id) return
      const apply = (t: Track): Track => (t.id === id ? patch(t) : t)
      setLibraryTracks((prev) => prev.map(apply))
      setQueue((prev) => prev.map((q) => ({ ...q, track: apply(q.track) })))
      setDetailsTrack((prev) => (prev?.id === id ? patch(prev) : prev))
      persistCatalogDebounced()
    },
    [persistCatalogDebounced],
  )

  const saveTrackMetadata = useCallback(
    async (trackId: string, fields: TrackMetadataFields): Promise<WriteAudioTagsResult> => {
      const id = trackId.trim()
      if (!id) return { ok: false, reason: 'Invalid track.' }
      const existing = libraryTracksRef.current.find((t) => t.id === id)
      if (!existing) return { ok: false, reason: 'Track not found.' }
      const patched = applyTrackMetadataPatch(existing, fields)
      patchTrackById(id, () => patched)
      if (!patched.library) return { ok: true }
      return writeAudioTagsToFile(
        patched,
        { title: patched.title, artist: patched.artist, album: patched.album },
        rootHandlesRef.current,
        true,
      )
    },
    [patchTrackById],
  )

  const writeLibraryTracksToFiles = useCallback(
    async (tracks: readonly Track[]): Promise<WriteAudioTagsBulkResult> => {
      return writeAudioTagsToTracks(tracks, rootHandlesRef.current, true)
    },
    [],
  )

  const patchAlbumMetadataByKey = useCallback(
    (albumKey: string, fields: AlbumMetadataFields): string | null => {
      const key = albumKey.trim()
      if (!key) return null
      const artist = fields.artist.trim()
      if (!artist) return null
      const album = fields.album.trim()
      const matchesKey = (t: Track): boolean => albumCompositeKey(t.album, t.artist) === key
      const toPatch = tracksMatchingAlbumKey(libraryTracksRef.current, key)
      if (toPatch.length === 0) return null
      const newKey = albumCompositeKey(album || toPatch[0].album, artist)
      const patchTrack = (t: Track): Track =>
        matchesKey(t) ? applyAlbumMetadataPatch(t, { artist, album }) : t
      setLibraryTracks((prev) => prev.map(patchTrack))
      setQueue((prev) => prev.map((q) => ({ ...q, track: patchTrack(q.track) })))
      setDetailsTrack((prev) => (prev && matchesKey(prev) ? patchTrack(prev) : prev))
      setFavoriteAlbumKeys((prev) => {
        if (!prev.includes(key)) return prev
        const without = prev.filter((k) => k !== key)
        if (without.includes(newKey)) return without
        return [...without, newKey]
      })
      persistCatalogDebounced()
      return newKey
    },
    [persistCatalogDebounced],
  )

  const patchArtistMetadataByKey = useCallback(
    (artistName: string, fields: ArtistMetadataFields): string | null => {
      const oldName = artistName.trim()
      const newName = fields.artist.trim()
      if (!oldName || !newName) return null
      const matchesArtist = (t: Track): boolean => artistDisplayName(t.artist) === oldName
      const toPatch = tracksMatchingArtistName(libraryTracksRef.current, oldName)
      if (toPatch.length === 0) return null
      const patchTrack = (t: Track): Track =>
        matchesArtist(t) ? applyArtistMetadataPatch(t, { artist: newName }) : t
      setLibraryTracks((prev) => prev.map(patchTrack))
      setQueue((prev) => prev.map((q) => ({ ...q, track: patchTrack(q.track) })))
      setDetailsTrack((prev) => (prev && matchesArtist(prev) ? patchTrack(prev) : prev))
      setFavoriteArtistNames((prev) => {
        if (!prev.includes(oldName)) return prev
        const without = prev.filter((n) => n !== oldName)
        if (without.includes(newName)) return without
        return [...without, newName]
      })
      setFavoriteAlbumKeys((prev) => {
        let changed = false
        const next = prev.map((key) => {
          const parts = key.split('\u0000')
          const album = parts[0] ?? ''
          const artist = parts[1] ?? ''
          if (artistDisplayName(artist) !== oldName) return key
          changed = true
          return albumCompositeKey(album, newName)
        })
        if (!changed) return prev
        return [...new Set(next)]
      })
      persistCatalogDebounced()
      return newName
    },
    [persistCatalogDebounced],
  )

  useEffect(() => {
    if (!youtubePreferences.prefetchQueueVideoIds) return undefined
    if (readYoutubeDataApiBlocked()) return undefined
    const limit = youtubePreferences.prefetchQueueMaxTracks
    const targets = collectYoutubePrefetchTargets(queue.map((row) => row.track)).slice(0, limit)
    if (targets.length === 0) return undefined
    const controller = new AbortController()
    const prefetchCount = targets.length
    beginYoutubePrefetch(prefetchCount)
    void prefetchYoutubeVideoIds(
      targets,
      (trackId, videoId) => {
        patchTrackById(trackId, (t) => ({ ...t, youtubeVideoId: videoId }))
      },
      { signal: controller.signal },
    ).finally(() => {
      endYoutubePrefetch(prefetchCount)
    })
    return (): void => {
      controller.abort()
    }
  }, [
    queue,
    patchTrackById,
    youtubePreferences.prefetchQueueVideoIds,
    youtubePreferences.prefetchQueueMaxTracks,
    beginYoutubePrefetch,
    endYoutubePrefetch,
  ])

  const addToQueue = useCallback((items: Track | readonly Track[]) => {
    const list = Array.isArray(items) ? items : [items]
    const rows: QueuedTrack[] = list.map((track) => ({
      queueId: crypto.randomUUID(),
      track,
    }))
    setQueue((prev) => [...prev, ...rows])
  }, [])

  const playNow = useCallback((items: Track | readonly Track[]) => {
    const list = Array.isArray(items) ? [...items] : [items]
    if (list.length === 0) return
    const rows: QueuedTrack[] = list.map((track) => ({
      queueId: crypto.randomUUID(),
      track,
    }))
    const firstId = rows[0]!.queueId
    playbackReportRef.current = { activeQueueId: firstId, positionSec: 0 }
    setQueue(rows)
    setPlayNowRequest({ activeQueueId: firstId })
    if (rememberLastQueueRef.current) {
      if (persistPlaybackTimerRef.current) {
        clearTimeout(persistPlaybackTimerRef.current)
        persistPlaybackTimerRef.current = null
      }
      writeStoredPlaybackSnapshot({
        trackIds: list.map((t) => t.id),
        tracks: list,
        activeTrackId: list[0]!.id,
        positionSec: 0,
      })
    }
  }, [])

  const consumePlayNowRequest = useCallback(() => {
    setPlayNowRequest(null)
  }, [])

  const addToLibrary = useCallback(
    (items: Track | readonly Track[]) => {
      const list = (Array.isArray(items) ? items : [items]).map(normalizeTrackForLibrarySave)
      if (list.length === 0) return
      setLibraryTracks((prev) => {
        const byId = new Map(prev.map((t) => [t.id, t]))
        let changed = false
        for (const track of list) {
          const existing = byId.get(track.id)
          if (existing) {
            byId.set(track.id, {
              ...existing,
              ...track,
              youtubeVideoId: track.youtubeVideoId ?? existing.youtubeVideoId,
            })
            changed = true
            continue
          }
          byId.set(track.id, track)
          changed = true
        }
        return changed ? [...byId.values()] : prev
      })
      persistCatalogDebounced()
    },
    [persistCatalogDebounced],
  )

  const removeFromLibrary = useCallback(
    (items: Track | readonly Track[]) => {
      const list = Array.isArray(items) ? items : [items]
      const removedIds = new Set(list.map((t) => t.id).filter(Boolean))
      if (removedIds.size === 0) return

      setLibraryTracks((prev) => prev.filter((t) => !removedIds.has(t.id)))
      setFavoriteSongIds((prev) => prev.filter((id) => !removedIds.has(id)))
      setQueue((prev) => prev.filter((row) => !removedIds.has(row.track.id)))
      persistCatalogDebounced()
    },
    [persistCatalogDebounced],
  )

  const removeAlbumFromLibrary = useCallback(
    (albumKey: string) => {
      const key = albumKey.trim()
      if (!key) return
      const toRemove = tracksMatchingAlbumKey(libraryTracksRef.current, key)
      if (toRemove.length === 0) return
      setFavoriteAlbumKeys((prev) => prev.filter((k) => k !== key))
      removeFromLibrary(toRemove)
    },
    [removeFromLibrary],
  )

  const removeArtistFromLibrary = useCallback(
    (artistName: string) => {
      const name = artistName.trim()
      if (!name) return
      const toRemove = tracksMatchingArtistName(libraryTracksRef.current, name)
      if (toRemove.length === 0) return
      setFavoriteArtistNames((prev) => prev.filter((n) => n !== name))
      removeFromLibrary(toRemove)
    },
    [removeFromLibrary],
  )

  const removeAllMusicBrainzFromLibrary = useCallback(() => {
    const current = libraryTracksRef.current
    const removedIds = new Set(current.filter(isPersistedLibraryTrack).map((track) => track.id))
    if (removedIds.size === 0) return

    setLibraryTracks(filterOutPersistedLibraryTracks(current))
    setFavoriteSongIds((prev) => prev.filter((id) => !removedIds.has(id)))
    setQueue((prev) => prev.filter((row) => !removedIds.has(row.track.id)))
    persistCatalogDebounced()
  }, [persistCatalogDebounced])

  const removeFromQueue = useCallback((queueId: string) => {
    setQueue((prev) => prev.filter((q) => q.queueId !== queueId))
  }, [])

  const clearQueue = useCallback(() => {
    playbackReportRef.current = { activeQueueId: null, positionSec: 0 }
    setQueue([])
    if (rememberLastQueueRef.current) {
      if (persistPlaybackTimerRef.current) {
        clearTimeout(persistPlaybackTimerRef.current)
        persistPlaybackTimerRef.current = null
      }
      writeStoredPlaybackSnapshot(buildEmptyPlaybackSnapshot())
    }
  }, [])

  const reorderQueueItems = useCallback((fromIndex: number, toIndex: number) => {
    if (!Number.isFinite(fromIndex) || !Number.isFinite(toIndex)) return
    const fi = Math.trunc(fromIndex)
    const ti = Math.trunc(toIndex)
    setQueue((prev) => {
      if (fi < 0 || ti < 0 || fi >= prev.length || ti >= prev.length) return prev
      if (fi === ti) return prev
      const next = [...prev]
      const [moved] = next.splice(fi, 1)
      next.splice(ti, 0, moved)
      return next
    })
  }, [])

  const recordRecentlyPlayedTrack = useCallback((trackId: string) => {
    const id = trackId.trim()
    if (!id) return
    setRecentlyPlayedTrackIds((prev) => {
      const next = [id, ...prev.filter((x) => x !== id)]
      return next.slice(0, RECENTLY_PLAYED_LIMIT)
    })
  }, [])

  const recordTrackPlaybackStarted = useCallback(
    (trackId: string) => {
      const id = trackId.trim()
      if (!id) return
      const now = Date.now()
      recordRecentlyPlayedTrack(id)
      setListeningStats((prev) => {
        const current = prev[id]
        return {
          ...prev,
          [id]: {
            trackId: id,
            playCount: (current?.playCount ?? 0) + 1,
            completedCount: current?.completedCount ?? 0,
            skipCount: current?.skipCount ?? 0,
            totalListenSec: current?.totalListenSec ?? 0,
            firstPlayedAt: current?.firstPlayedAt ?? now,
            lastPlayedAt: now,
            lastCompletedAt: current?.lastCompletedAt,
            lastSkippedAt: current?.lastSkippedAt,
          },
        }
      })
    },
    [recordRecentlyPlayedTrack],
  )

  const recordTrackPlaybackProgress = useCallback((trackId: string, listenedSec: number) => {
    const id = trackId.trim()
    if (!id || !Number.isFinite(listenedSec) || listenedSec <= 0) return
    setListeningStats((prev) => {
      const current = prev[id]
      const delta = Math.min(30, Math.max(0, listenedSec))
      if (delta <= 0) return prev
      return {
        ...prev,
        [id]: {
          trackId: id,
          playCount: current?.playCount ?? 0,
          completedCount: current?.completedCount ?? 0,
          skipCount: current?.skipCount ?? 0,
          totalListenSec: (current?.totalListenSec ?? 0) + delta,
          firstPlayedAt: current?.firstPlayedAt,
          lastPlayedAt: current?.lastPlayedAt,
          lastCompletedAt: current?.lastCompletedAt,
          lastSkippedAt: current?.lastSkippedAt,
        },
      }
    })
  }, [])

  const recordTrackPlaybackCompleted = useCallback((trackId: string) => {
    const id = trackId.trim()
    if (!id) return
    const now = Date.now()
    setListeningStats((prev) => {
      const current = prev[id]
      return {
        ...prev,
        [id]: {
          trackId: id,
          playCount: current?.playCount ?? 0,
          completedCount: (current?.completedCount ?? 0) + 1,
          skipCount: current?.skipCount ?? 0,
          totalListenSec: current?.totalListenSec ?? 0,
          firstPlayedAt: current?.firstPlayedAt,
          lastPlayedAt: current?.lastPlayedAt,
          lastCompletedAt: now,
          lastSkippedAt: current?.lastSkippedAt,
        },
      }
    })
  }, [])

  const recordTrackSkipped = useCallback((trackId: string) => {
    const id = trackId.trim()
    if (!id) return
    const now = Date.now()
    setListeningStats((prev) => {
      const current = prev[id]
      return {
        ...prev,
        [id]: {
          trackId: id,
          playCount: current?.playCount ?? 0,
          completedCount: current?.completedCount ?? 0,
          skipCount: (current?.skipCount ?? 0) + 1,
          totalListenSec: current?.totalListenSec ?? 0,
          firstPlayedAt: current?.firstPlayedAt,
          lastPlayedAt: current?.lastPlayedAt,
          lastCompletedAt: current?.lastCompletedAt,
          lastSkippedAt: now,
        },
      }
    })
  }, [])

  const clearListeningStats = useCallback(() => {
    setListeningStats({})
    clearStoredListeningStats()
  }, [])

  const recordRecentBrowseSearch = useCallback((source: BrowseSearchSource, query: string) => {
    const trimmed = query.trim()
    if (!trimmed) return
    if (source === 'library' && trimmed.length < 2) return
    if (source === 'musicbrainz' && trimmed.length < 3) return
    if (source === 'youtube' && trimmed.length < 2) return
    setRecentBrowseSearches((prev) => {
      const next = appendRecentBrowseSearch(
        prev,
        { source, query: trimmed },
        RECENT_BROWSE_SEARCHES_LIMIT,
      )
      if (recentBrowseSearchesReadyRef.current) {
        writeStoredRecentBrowseSearches(next)
      }
      return next
    })
  }, [])

  const clearRecentBrowseSearches = useCallback(() => {
    setRecentBrowseSearches([])
    clearStoredRecentBrowseSearches()
  }, [])

  const createPlaylist = useCallback(
    (name: string, initialTrackIds?: readonly string[]): Playlist | null => {
      const cleanName = normalizePlaylistName(name)
      if (!cleanName) return null
      const now = Date.now()
      const seenIds = new Set<string>()
      const trackIds: string[] = []
      if (initialTrackIds) {
        for (const id of initialTrackIds) {
          if (!id || seenIds.has(id)) continue
          seenIds.add(id)
          trackIds.push(id)
        }
      }
      const playlist: Playlist = {
        id: generatePlaylistId(),
        name: cleanName,
        trackIds,
        createdAt: now,
        updatedAt: now,
      }
      setPlaylists((prev) => [playlist, ...prev].slice(0, PLAYLISTS_LIMIT))
      return playlist
    },
    [],
  )

  const renamePlaylist = useCallback((playlistId: string, name: string): boolean => {
    const cleanName = normalizePlaylistName(name)
    if (!cleanName) return false
    let matched = false
    setPlaylists((prev) =>
      prev.map((p) => {
        if (p.id !== playlistId) return p
        matched = true
        if (p.name === cleanName) return p
        return { ...p, name: cleanName, updatedAt: Date.now() }
      }),
    )
    return matched
  }, [])

  const deletePlaylist = useCallback((playlistId: string) => {
    setPlaylists((prev) => prev.filter((p) => p.id !== playlistId))
  }, [])

  const addTracksToPlaylist = useCallback(
    (playlistId: string, tracks: Track | readonly Track[]): number => {
      const list = trackArrayFromInput(tracks)
      const ids = list.map((t) => t.id).filter((id): id is string => Boolean(id))
      if (ids.length === 0) return 0
      let added = 0
      setPlaylists((prev) =>
        prev.map((p) => {
          if (p.id !== playlistId) return p
          const next = appendTrackIdsToPlaylist(p, ids)
          added = next.trackIds.length - p.trackIds.length
          return next
        }),
      )
      return added
    },
    [],
  )

  const removeTracksFromPlaylist = useCallback(
    (playlistId: string, trackIds: readonly string[]) => {
      if (trackIds.length === 0) return
      setPlaylists((prev) =>
        prev.map((p) => (p.id === playlistId ? removeTrackIdsFromPlaylist(p, trackIds) : p)),
      )
    },
    [],
  )

  const reorderPlaylistTracks = useCallback(
    (playlistId: string, fromIndex: number, toIndex: number) => {
      setPlaylists((prev) =>
        prev.map((p) => (p.id === playlistId ? reorderPlaylistTrackIds(p, fromIndex, toIndex) : p)),
      )
    },
    [],
  )

  const openAddToPlaylist = useCallback(
    (tracks: Track | readonly Track[], contextLabel: string) => {
      const list = trackArrayFromInput(tracks)
      if (list.length === 0) return
      setAddToPlaylistTarget({ tracks: list, contextLabel })
    },
    [],
  )

  const closeAddToPlaylist = useCallback(() => {
    setAddToPlaylistTarget(null)
  }, [])

  const setCompactLists = useCallback((next: boolean) => {
    setCompactListsState(next)
    safeWriteStoredBoolean(STORAGE_COMPACT_LISTS, next)
  }, [])

  const setAutoRescanOnStartup = useCallback((next: boolean) => {
    setAutoRescanOnStartupState(next)
    safeWriteStoredBoolean(STORAGE_AUTO_RESCAN_ON_STARTUP, next)
  }, [])

  const setLogLibraryScanTiming = useCallback((next: boolean) => {
    logLibraryScanTimingRef.current = next
    setLogLibraryScanTimingState(next)
    safeWriteStoredBoolean(STORAGE_LOG_LIBRARY_SCAN_TIMING, next)
  }, [])

  const openTrackDetails = useCallback((track: Track) => {
    setDetailsTrack(track)
  }, [])

  const closeTrackDetails = useCallback(() => {
    setDetailsTrack(null)
  }, [])

  const openRelatedSongs = useCallback((track: Track) => {
    setRelatedSongsSeedTrack(track)
  }, [])

  const closeRelatedSongs = useCallback(() => {
    setRelatedSongsSeedTrack(null)
  }, [])

  const setScanPreferences = useCallback((next: LibraryScanPreferences) => {
    scanPrefsRef.current = next
    setScanPreferencesState(next)
    writeStoredLibraryScanPreferences(next)
  }, [])

  const setRememberLastQueue = useCallback(
    (next: boolean) => {
      rememberLastQueueRef.current = next
      setRememberLastQueueState(next)
      safeWriteStoredBoolean(STORAGE_REMEMBER_LAST_QUEUE, next)
      if (!next) {
        writeStoredPlaybackSnapshot(buildEmptyPlaybackSnapshot())
      } else {
        flushPersistPlaybackNow()
      }
    },
    [flushPersistPlaybackNow],
  )

  const consumePlaybackRestore = useCallback((): void => {
    setPlaybackRestore(null)
  }, [])

  const reportPlayback = useCallback(
    (activeQueueId: string | null, positionSec: number): void => {
      playbackReportRef.current = { activeQueueId, positionSec }
      persistPlaybackDebounced()
    },
    [persistPlaybackDebounced],
  )

  const resolveFileForTrack = useCallback((track: Track) => {
    return resolveTrackToFile(track, rootHandlesRef.current)
  }, [])

  const favoriteSongSet = useMemo(() => new Set(favoriteSongIds), [favoriteSongIds])
  const favoriteArtistSet = useMemo(() => new Set(favoriteArtistNames), [favoriteArtistNames])
  const favoriteAlbumSet = useMemo(() => new Set(favoriteAlbumKeys), [favoriteAlbumKeys])

  const isFavoriteSong = useCallback(
    (trackId: string) => favoriteSongSet.has(trackId),
    [favoriteSongSet],
  )
  const isFavoriteArtist = useCallback(
    (name: string) => favoriteArtistSet.has(name),
    [favoriteArtistSet],
  )
  const isFavoriteAlbum = useCallback(
    (albumKey: string) => favoriteAlbumSet.has(albumKey),
    [favoriteAlbumSet],
  )

  const toggleFavoriteSong = useCallback((trackId: string) => {
    setFavoriteSongIds((prev) => toggleSortedStringId(prev, trackId))
  }, [])

  const toggleFavoriteArtist = useCallback((name: string) => {
    setFavoriteArtistNames((prev) => toggleSortedStringId(prev, name))
  }, [])

  const toggleFavoriteAlbum = useCallback((albumKey: string) => {
    setFavoriteAlbumKeys((prev) => toggleSortedStringId(prev, albumKey))
  }, [])

  const toggleFavoriteTrack = useCallback(
    (track: Track) => {
      toggleFavoriteSong(track.id)
    },
    [toggleFavoriteSong],
  )

  const importFavorites = useCallback(
    (data: {
      songIds: readonly string[]
      artistNames: readonly string[]
      albumKeys: readonly string[]
    }) => {
      setFavoriteSongIds([...data.songIds])
      setFavoriteArtistNames([...data.artistNames])
      setFavoriteAlbumKeys([...data.albumKeys])
    },
    [],
  )

  useEffect(() => {
    if (!favoritesReadyRef.current) return
    const db = dbRef.current
    if (!db) return
    void idbPutFavorites(db, {
      songIds: favoriteSongIds,
      artistNames: favoriteArtistNames,
      albumKeys: favoriteAlbumKeys,
    }).catch(() => {
      /* ignore */
    })
  }, [favoriteSongIds, favoriteArtistNames, favoriteAlbumKeys])

  const ingestPickedFolder = useCallback(
    async (handle: FileSystemDirectoryHandle): Promise<void> => {
      try {
        const id = crypto.randomUUID()
        const addedAt = Date.now()
        const row: StoredLibraryRoot = {
          id,
          name: handle.name,
          addedAt,
          handle,
        }
        const db = dbRef.current
        if (!db) {
          setScanError('Library database is not ready yet.')
          return
        }
        await idbPutRoot(db, row)
        rootHandlesRef.current.set(id, handle)
        const meta: LibraryRootMeta[] = [
          ...rootsMetaRef.current,
          { id, name: handle.name, addedAt },
        ]
        rootsMetaRef.current = meta
        setRoots(meta)
        await runScan(true)
      } catch (e) {
        setScanError(formatFsAccessErrorMessage(e))
      }
    },
    [runScan],
  )

  /** Call only from a direct click handler so the directory picker keeps user activation. */
  const addLibraryFolder = useCallback((): void => {
    if (typeof window === 'undefined') return
    if (!window.isSecureContext) {
      setScanError(
        'Folder access needs a secure context. Use https:// or open the app at http://localhost.',
      )
      return
    }
    if (!hasDirectoryPicker) {
      setScanError(
        'This browser does not support folder selection. Use a Chromium-based desktop browser.',
      )
      return
    }
    const db = dbRef.current
    if (!db) {
      setScanError('Library database is not ready yet.')
      return
    }
    setScanError(null)
    let pickerPromise: Promise<FileSystemDirectoryHandle>
    try {
      pickerPromise = window.showDirectoryPicker({ mode: 'readwrite' })
    } catch (e) {
      const msg = formatFsAccessErrorMessage(e)
      if (msg) setScanError(msg)
      return
    }
    void pickerPromise
      .then((handle) => ingestPickedFolder(handle))
      .catch((e) => {
        if (e instanceof DOMException && e.name === 'AbortError') return
        const msg = formatFsAccessErrorMessage(e)
        if (msg) setScanError(msg)
      })
  }, [hasDirectoryPicker, ingestPickedFolder])

  const removeLibraryFolder = useCallback(
    async (id: string): Promise<void> => {
      const db = dbRef.current
      if (!db) return
      try {
        await idbDeleteRoot(db, id)
        rootHandlesRef.current.delete(id)
        const meta = rootsMetaRef.current.filter((r) => r.id !== id)
        rootsMetaRef.current = meta
        setRoots(meta)
        await runScan(true)
      } catch (e) {
        setScanError(e instanceof Error ? e.message : 'Could not remove library folder')
      }
    },
    [runScan],
  )

  const rescanAll = useCallback(async (): Promise<void> => {
    await runScan(true)
  }, [runScan])

  useEffect(() => {
    let disposed = false
    void (async (): Promise<void> => {
      let catalogTracks: Track[] = []
      try {
        const db = await openLibraryDb()
        if (disposed) {
          db.close()
          return
        }
        dbRef.current = db
        try {
          const fav = await idbGetFavorites(db)
          if (!disposed) {
            setFavoriteSongIds(fav.songIds)
            setFavoriteArtistNames(fav.artistNames)
            setFavoriteAlbumKeys(fav.albumKeys)
          }
        } catch {
          if (!disposed) {
            setFavoriteSongIds([])
            setFavoriteArtistNames([])
            setFavoriteAlbumKeys([])
          }
        }
        if (!disposed) {
          favoritesReadyRef.current = true
        }
        void navigator.storage?.persist?.()
        const rows = await idbGetAllRoots(db)
        if (disposed) return
        const map = new Map<string, FileSystemDirectoryHandle>()
        const meta: LibraryRootMeta[] = []
        for (const r of rows) {
          map.set(r.id, r.handle)
          meta.push({ id: r.id, name: r.name, addedAt: r.addedAt })
        }
        if (disposed) return
        rootHandlesRef.current = map
        rootsMetaRef.current = meta
        setRoots(meta)
        catalogTracks = []
        let cachedApplied = false
        let savedTracksFromCache: Track[] = []
        try {
          const cached = await idbGetCatalog(db)
          if (!disposed && cached) {
            const parsed = parsePersistedCatalogTracks(cached.tracks)
            savedTracksFromCache = extractPersistedLibraryTracks(parsed)
            if (meta.length > 0 && catalogMatchesRoots(meta, cached.rootIds)) {
              catalogTracks = parsed
              setLibraryTracks(catalogTracks)
              cachedApplied = true
            } else if (savedTracksFromCache.length > 0) {
              catalogTracks = savedTracksFromCache
              setLibraryTracks(savedTracksFromCache)
              cachedApplied = true
            }
          }
        } catch {
          /* ignore missing or corrupt catalog */
        }
        if (disposed) return
        const mayRescanOnLoad = meta.length > 0 && (await everyHandleHasGrantedReadAccess(map))
        const shouldAutoRescan = safeReadStoredBooleanOrDefault(
          STORAGE_AUTO_RESCAN_ON_STARTUP,
          true,
        )
        if (disposed) return
        if (mayRescanOnLoad && shouldAutoRescan && !disposed) {
          const result = await performScan(false)
          if (disposed || !result) return
          const { tracks: next, firstError, failedRootCount } = result
          const needsGesture = next.length === 0 && meta.length > 0 && failedRootCount > 0
          if (needsGesture) {
            if (cachedApplied) {
              setScanError(null)
            } else {
              catalogTracks = mergeScannedTracksWithSavedLibrary(next, savedTracksFromCache)
              setLibraryTracks(catalogTracks)
              try {
                await idbPutCatalog(
                  db,
                  meta.map((r) => r.id),
                  catalogTracks,
                )
              } catch {
                /* ignore */
              }
              setScanError(firstError ? `${firstError} ${DISK_ACCESS_HINT}` : DISK_ACCESS_HINT)
            }
          } else {
            catalogTracks = mergeScannedTracksWithSavedLibrary(next, libraryTracksRef.current)
            setLibraryTracks(catalogTracks)
            try {
              await idbPutCatalog(
                db,
                meta.map((r) => r.id),
                catalogTracks,
              )
            } catch {
              /* ignore */
            }
          }
        }
      } catch (e) {
        if (!disposed) {
          setScanError(e instanceof Error ? e.message : 'Could not load library')
        }
      } finally {
        if (!disposed) {
          if (!queueHydratedRef.current) {
            hydrateQueueFromStorage(catalogTracks)
          }
          setCatalogInitDone(true)
        }
      }
    })()
    return (): void => {
      disposed = true
    }
  }, [performScan, hydrateQueueFromStorage])

  const value = useMemo(
    () => ({
      roots,
      libraryTracks,
      queue,
      recentlyPlayedTrackIds,
      listeningStats,
      recentBrowseSearches,
      compactLists,
      autoRescanOnStartup,
      logLibraryScanTiming,
      scanPreferences,
      rememberLastQueue,
      playbackRestore,
      playNowRequest,
      isQueueReady,
      isScanning,
      youtubePrefetchActive,
      youtubePrefetchVideoCount,
      beginYoutubePrefetch,
      endYoutubePrefetch,
      scanError,
      hasDirectoryPicker,
      addLibraryFolder,
      removeLibraryFolder,
      rescanAll,
      addToQueue,
      playNow,
      addToLibrary,
      removeFromLibrary,
      removeAlbumFromLibrary,
      removeArtistFromLibrary,
      removeAllMusicBrainzFromLibrary,
      removeFromQueue,
      clearQueue,
      recordRecentlyPlayedTrack,
      recordTrackPlaybackStarted,
      recordTrackPlaybackProgress,
      recordTrackPlaybackCompleted,
      recordTrackSkipped,
      clearListeningStats,
      recordRecentBrowseSearch,
      clearRecentBrowseSearches,
      setCompactLists,
      setAutoRescanOnStartup,
      setLogLibraryScanTiming,
      setScanPreferences,
      setRememberLastQueue,
      consumePlaybackRestore,
      consumePlayNowRequest,
      reportPlayback,
      reorderQueueItems,
      resolveFileForTrack,
      bumpTrackDuration,
      patchTrackById,
      saveTrackMetadata,
      writeLibraryTracksToFiles,
      patchAlbumMetadataByKey,
      patchArtistMetadataByKey,
      favoriteSongIds,
      favoriteArtistNames,
      favoriteAlbumKeys,
      isFavoriteSong,
      isFavoriteArtist,
      isFavoriteAlbum,
      toggleFavoriteSong,
      toggleFavoriteArtist,
      toggleFavoriteAlbum,
      toggleFavoriteTrack,
      importFavorites,
      detailsTrack,
      openTrackDetails,
      closeTrackDetails,
      relatedSongsSeedTrack,
      openRelatedSongs,
      closeRelatedSongs,
      playlists,
      createPlaylist,
      renamePlaylist,
      deletePlaylist,
      addTracksToPlaylist,
      removeTracksFromPlaylist,
      reorderPlaylistTracks,
      openAddToPlaylist,
    }),
    [
      roots,
      libraryTracks,
      queue,
      recentlyPlayedTrackIds,
      listeningStats,
      recentBrowseSearches,
      compactLists,
      autoRescanOnStartup,
      logLibraryScanTiming,
      scanPreferences,
      rememberLastQueue,
      playbackRestore,
      playNowRequest,
      isQueueReady,
      isScanning,
      youtubePrefetchActive,
      youtubePrefetchVideoCount,
      beginYoutubePrefetch,
      endYoutubePrefetch,
      scanError,
      hasDirectoryPicker,
      addLibraryFolder,
      removeLibraryFolder,
      rescanAll,
      addToQueue,
      playNow,
      addToLibrary,
      removeFromLibrary,
      removeAlbumFromLibrary,
      removeArtistFromLibrary,
      removeAllMusicBrainzFromLibrary,
      removeFromQueue,
      clearQueue,
      recordRecentlyPlayedTrack,
      recordTrackPlaybackStarted,
      recordTrackPlaybackProgress,
      recordTrackPlaybackCompleted,
      recordTrackSkipped,
      clearListeningStats,
      recordRecentBrowseSearch,
      clearRecentBrowseSearches,
      setCompactLists,
      setAutoRescanOnStartup,
      setLogLibraryScanTiming,
      setScanPreferences,
      setRememberLastQueue,
      consumePlaybackRestore,
      consumePlayNowRequest,
      reportPlayback,
      reorderQueueItems,
      resolveFileForTrack,
      bumpTrackDuration,
      patchTrackById,
      saveTrackMetadata,
      writeLibraryTracksToFiles,
      patchAlbumMetadataByKey,
      patchArtistMetadataByKey,
      favoriteSongIds,
      favoriteArtistNames,
      favoriteAlbumKeys,
      isFavoriteSong,
      isFavoriteArtist,
      isFavoriteAlbum,
      toggleFavoriteSong,
      toggleFavoriteArtist,
      toggleFavoriteAlbum,
      toggleFavoriteTrack,
      importFavorites,
      detailsTrack,
      openTrackDetails,
      closeTrackDetails,
      relatedSongsSeedTrack,
      openRelatedSongs,
      closeRelatedSongs,
      playlists,
      createPlaylist,
      renamePlaylist,
      deletePlaylist,
      addTracksToPlaylist,
      removeTracksFromPlaylist,
      reorderPlaylistTracks,
      openAddToPlaylist,
    ],
  )

  return (
    <LibraryContext.Provider value={value}>
      {props.children}
      <LibraryScanNotification progress={scanProgress} onDismiss={dismissScanNotification} />
      <TrackDetailsDialog track={detailsTrack} onClose={closeTrackDetails} />
      <RelatedSongsDialog seedTrack={relatedSongsSeedTrack} onClose={closeRelatedSongs} />
      {addToPlaylistTarget ? (
        <AddToPlaylistDialog
          tracks={addToPlaylistTarget.tracks}
          contextLabel={addToPlaylistTarget.contextLabel}
          onClose={closeAddToPlaylist}
        />
      ) : null}
    </LibraryContext.Provider>
  )
}

/**
 * Access configured library folders and scanned tracks.
 */
export function useLibrary(): LibraryContextValue {
  const ctx = useContext(LibraryContext)
  if (!ctx) {
    throw new Error('useLibrary must be used within LibraryProvider')
  }
  return ctx
}
