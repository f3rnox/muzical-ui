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
import { resolveTrackToFile } from '@/lib/library/resolve-track-file'
import LibraryScanNotification from '@/components/LibraryScanNotification'
import type { LibraryRootMeta } from '@/types/library-root-meta'
import type { LibraryScanProgress } from '@/types/library-scan-progress'
import type { LibraryScanPreferences } from '@/types/library-scan-preferences'
import readStoredLibraryScanPreferences from '@/lib/library/read-stored-library-scan-preferences'
import writeStoredLibraryScanPreferences from '@/lib/library/write-stored-library-scan-preferences'
import scanPreferencesToTreeOptions from '@/lib/library/scan-preferences-to-tree-options'
import readStoredPlaybackSnapshot from '@/lib/playback/read-stored-playback-snapshot'
import writeStoredPlaybackSnapshot from '@/lib/playback/write-stored-playback-snapshot'
import buildQueueFromSnapshot from '@/lib/playback/build-queue-from-snapshot'

export type { LibraryRootMeta } from '@/types/library-root-meta'
export type { LibraryScanPreferences } from '@/types/library-scan-preferences'

export type PlaybackRestore = {
  activeQueueId: string | null
  positionSec: number
}

type LibraryContextValue = {
  roots: LibraryRootMeta[]
  /** Full catalog from scans — not the playback queue */
  libraryTracks: Track[]
  queue: QueuedTrack[]
  recentlyPlayedTrackIds: readonly string[]
  compactLists: boolean
  autoRescanOnStartup: boolean
  scanPreferences: LibraryScanPreferences
  rememberLastQueue: boolean
  playbackRestore: PlaybackRestore | null
  isQueueReady: boolean
  isScanning: boolean
  scanError: string | null
  hasDirectoryPicker: boolean
  addLibraryFolder: () => void
  removeLibraryFolder: (id: string) => Promise<void>
  rescanAll: () => Promise<void>
  addToQueue: (items: Track | readonly Track[]) => void
  addToLibrary: (track: Track) => void
  removeFromQueue: (queueId: string) => void
  clearQueue: () => void
  recordRecentlyPlayedTrack: (trackId: string) => void
  setCompactLists: (next: boolean) => void
  setAutoRescanOnStartup: (next: boolean) => void
  setScanPreferences: (next: LibraryScanPreferences) => void
  setRememberLastQueue: (next: boolean) => void
  consumePlaybackRestore: () => void
  reportPlayback: (activeQueueId: string | null, positionSec: number) => void
  reorderQueueItems: (fromIndex: number, toIndex: number) => void
  resolveFileForTrack: (track: Track) => Promise<File | null>
  bumpTrackDuration: (trackId: string, durationSec: number) => void
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
}

const LibraryContext = createContext<LibraryContextValue | null>(null)

const STORAGE_RECENTLY_PLAYED_TRACK_IDS = 'muzical.recentlyPlayedTrackIds'
const RECENTLY_PLAYED_LIMIT = 24
const STORAGE_COMPACT_LISTS = 'muzical.compactLists'
const STORAGE_AUTO_RESCAN_ON_STARTUP = 'muzical.autoRescanOnStartup'
const STORAGE_REMEMBER_LAST_QUEUE = 'muzical.rememberLastQueue'

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
  const dbRef = useRef<IDBDatabase | null>(null)
  const scanLockRef = useRef(false)
  const rootHandlesRef = useRef<Map<string, FileSystemDirectoryHandle>>(new Map())
  const rootsMetaRef = useRef<LibraryRootMeta[]>([])
  const libraryTracksRef = useRef<Track[]>([])
  const persistCatalogTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scanDismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const favoritesReadyRef = useRef(false)
  const scanPrefsRef = useRef<LibraryScanPreferences>(readStoredLibraryScanPreferences())
  const rememberLastQueueRef = useRef(false)
  const queueHydratedRef = useRef(false)
  const playbackReportRef = useRef({ activeQueueId: null as string | null, positionSec: 0 })
  const persistPlaybackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [favoriteSongIds, setFavoriteSongIds] = useState<string[]>([])
  const [favoriteArtistNames, setFavoriteArtistNames] = useState<string[]>([])
  const [favoriteAlbumKeys, setFavoriteAlbumKeys] = useState<string[]>([])
  const [roots, setRoots] = useState<LibraryRootMeta[]>([])
  const [libraryTracks, setLibraryTracks] = useState<Track[]>([])
  const [queue, setQueue] = useState<QueuedTrack[]>([])
  const [recentlyPlayedTrackIds, setRecentlyPlayedTrackIds] = useState<string[]>([])
  const [compactLists, setCompactListsState] = useState(false)
  const [autoRescanOnStartup, setAutoRescanOnStartupState] = useState(true)
  const [scanPreferences, setScanPreferencesState] = useState<LibraryScanPreferences>(
    readStoredLibraryScanPreferences,
  )
  const [rememberLastQueue, setRememberLastQueueState] = useState(false)
  const [playbackRestore, setPlaybackRestore] = useState<PlaybackRestore | null>(null)
  const [catalogInitDone, setCatalogInitDone] = useState(false)
  const [isQueueReady, setIsQueueReady] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState<LibraryScanProgress | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)
  const [hasDirectoryPicker, setHasDirectoryPicker] = useState(false)

  useEffect(() => {
    void Promise.resolve().then(() => {
      setHasDirectoryPicker(typeof window !== 'undefined' && 'showDirectoryPicker' in window)
    })
  }, [])

  useEffect(() => {
    void Promise.resolve().then(() => {
      setRecentlyPlayedTrackIds(safeReadStoredStringArray(STORAGE_RECENTLY_PLAYED_TRACK_IDS).slice(0, RECENTLY_PLAYED_LIMIT))
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
    safeWriteStoredStringArray(STORAGE_RECENTLY_PLAYED_TRACK_IDS, recentlyPlayedTrackIds.slice(0, RECENTLY_PLAYED_LIMIT))
  }, [recentlyPlayedTrackIds])

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
    if (q.length === 0) return
    const activeId = playbackReportRef.current.activeQueueId
    const activeRow = activeId ? q.find((row) => row.queueId === activeId) : q[0]
    writeStoredPlaybackSnapshot({
      trackIds: q.map((row) => row.track.id),
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
          setQueue(restored.queue)
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
    setIsQueueReady(true)
  }, [])

  useEffect(() => {
    if (!queueHydratedRef.current) return
    const byId = new Map(libraryTracks.map((t) => [t.id, t]))
    setQueue((prev) =>
      prev
        .filter((row) => byId.has(row.track.id))
        .map((row) => ({ ...row, track: byId.get(row.track.id) as Track })),
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
    void idbPutCatalog(db, meta.map((r) => r.id), libraryTracksRef.current).catch(() => {
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
        const result = await collectTracksForMeta(meta, map, treeOpts, applyScanProgressTick)
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
      setLibraryTracks(next)
      const db = dbRef.current
      if (db) {
        try {
          await idbPutCatalog(db, meta.map((r) => r.id), next)
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

  const bumpTrackDuration = useCallback((trackId: string, durationSec: number) => {
    if (!Number.isFinite(durationSec) || durationSec <= 0) return
    const patch = (t: Track): Track =>
      t.id === trackId && t.durationSec <= 0 ? { ...t, durationSec } : t
    setLibraryTracks((prev) => prev.map(patch))
    setQueue((prev) => prev.map((q) => ({ ...q, track: patch(q.track) })))
    persistCatalogDebounced()
  }, [persistCatalogDebounced])

  const addToQueue = useCallback((items: Track | readonly Track[]) => {
    const list = Array.isArray(items) ? items : [items]
    const rows: QueuedTrack[] = list.map((track) => ({
      queueId: crypto.randomUUID(),
      track,
    }))
    setQueue((prev) => [...prev, ...rows])
  }, [])

  const addToLibrary = useCallback((track: Track) => {
    setLibraryTracks((prev) => {
      if (prev.some((item) => item.id === track.id)) return prev
      return [...prev, track]
    })
    persistCatalogDebounced()
  }, [persistCatalogDebounced])

  const removeFromQueue = useCallback((queueId: string) => {
    setQueue((prev) => prev.filter((q) => q.queueId !== queueId))
  }, [])

  const clearQueue = useCallback(() => {
    setQueue([])
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

  const setCompactLists = useCallback((next: boolean) => {
    setCompactListsState(next)
    safeWriteStoredBoolean(STORAGE_COMPACT_LISTS, next)
  }, [])

  const setAutoRescanOnStartup = useCallback((next: boolean) => {
    setAutoRescanOnStartupState(next)
    safeWriteStoredBoolean(STORAGE_AUTO_RESCAN_ON_STARTUP, next)
  }, [])

  const setScanPreferences = useCallback((next: LibraryScanPreferences) => {
    scanPrefsRef.current = next
    setScanPreferencesState(next)
    writeStoredLibraryScanPreferences(next)
  }, [])

  const setRememberLastQueue = useCallback((next: boolean) => {
    rememberLastQueueRef.current = next
    setRememberLastQueueState(next)
    safeWriteStoredBoolean(STORAGE_REMEMBER_LAST_QUEUE, next)
    if (!next) {
      writeStoredPlaybackSnapshot({ trackIds: [], activeTrackId: null, positionSec: 0 })
    } else {
      flushPersistPlaybackNow()
    }
  }, [flushPersistPlaybackNow])

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

  const toggleFavoriteTrack = useCallback((track: Track) => {
    toggleFavoriteSong(track.id)
  }, [toggleFavoriteSong])

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
        const row: StoredLibraryRoot = { id, name: handle.name, addedAt, handle }
        const db = dbRef.current
        if (!db) {
          setScanError('Library database is not ready yet.')
          return
        }
        await idbPutRoot(db, row)
        rootHandlesRef.current.set(id, handle)
        const meta: LibraryRootMeta[] = [...rootsMetaRef.current, { id, name: handle.name, addedAt }]
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
      pickerPromise = window.showDirectoryPicker({ mode: 'read' })
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
        try {
          const cached = await idbGetCatalog(db)
          if (
            !disposed &&
            cached &&
            meta.length > 0 &&
            catalogMatchesRoots(meta, cached.rootIds)
          ) {
            catalogTracks = cached.tracks
            setLibraryTracks(catalogTracks)
            cachedApplied = true
          }
        } catch {
          /* ignore missing or corrupt catalog */
        }
        if (disposed) return
        const mayRescanOnLoad = meta.length > 0 && (await everyHandleHasGrantedReadAccess(map))
        const shouldAutoRescan = safeReadStoredBooleanOrDefault(STORAGE_AUTO_RESCAN_ON_STARTUP, true)
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
              catalogTracks = next
              setLibraryTracks(catalogTracks)
              try {
                await idbPutCatalog(db, meta.map((r) => r.id), next)
              } catch {
                /* ignore */
              }
              setScanError(firstError ? `${firstError} ${DISK_ACCESS_HINT}` : DISK_ACCESS_HINT)
            }
          } else {
            catalogTracks = next
            setLibraryTracks(catalogTracks)
            try {
              await idbPutCatalog(db, meta.map((r) => r.id), next)
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
      compactLists,
      autoRescanOnStartup,
      scanPreferences,
      rememberLastQueue,
      playbackRestore,
      isQueueReady,
      isScanning,
      scanError,
      hasDirectoryPicker,
      addLibraryFolder,
      removeLibraryFolder,
      rescanAll,
      addToQueue,
      addToLibrary,
      removeFromQueue,
      clearQueue,
      recordRecentlyPlayedTrack,
      setCompactLists,
      setAutoRescanOnStartup,
      setScanPreferences,
      setRememberLastQueue,
      consumePlaybackRestore,
      reportPlayback,
      reorderQueueItems,
      resolveFileForTrack,
      bumpTrackDuration,
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
    }),
    [
      roots,
      libraryTracks,
      queue,
      recentlyPlayedTrackIds,
      compactLists,
      autoRescanOnStartup,
      scanPreferences,
      rememberLastQueue,
      playbackRestore,
      isQueueReady,
      isScanning,
      scanError,
      hasDirectoryPicker,
      addLibraryFolder,
      removeLibraryFolder,
      rescanAll,
      addToQueue,
      addToLibrary,
      removeFromQueue,
      clearQueue,
      recordRecentlyPlayedTrack,
      setCompactLists,
      setAutoRescanOnStartup,
      setScanPreferences,
      setRememberLastQueue,
      consumePlaybackRestore,
      reportPlayback,
      reorderQueueItems,
      resolveFileForTrack,
      bumpTrackDuration,
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
    ],
  )

  return (
    <LibraryContext.Provider value={value}>
      {props.children}
      <LibraryScanNotification progress={scanProgress} onDismiss={dismissScanNotification} />
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
