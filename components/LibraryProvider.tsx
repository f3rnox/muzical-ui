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
import { scanDirectoryForTracks } from '@/lib/library/scan-tree'
import { resolveTrackToFile } from '@/lib/library/resolve-track-file'

export type LibraryRootMeta = {
  id: string
  name: string
  addedAt: number
}

type LibraryContextValue = {
  roots: LibraryRootMeta[]
  /** Full catalog from scans — not the playback queue */
  libraryTracks: Track[]
  queue: QueuedTrack[]
  recentlyPlayedTrackIds: readonly string[]
  isScanning: boolean
  scanError: string | null
  hasDirectoryPicker: boolean
  addLibraryFolder: () => void
  removeLibraryFolder: (id: string) => Promise<void>
  rescanAll: () => Promise<void>
  addToQueue: (items: Track | readonly Track[]) => void
  removeFromQueue: (queueId: string) => void
  clearQueue: () => void
  recordRecentlyPlayedTrack: (trackId: string) => void
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

type CollectTracksResult = {
  tracks: Track[]
  /** Roots whose handle could not be enumerated (blocked context, revoked permission, etc.) */
  failedRootCount: number
  /** First scan error message for diagnostics (permission, etc.) */
  firstError: string | null
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

function scanFailureMessage(e: unknown): string {
  if (e instanceof DOMException) {
    return `${e.name}: ${e.message}`
  }
  if (e instanceof Error) {
    return e.message
  }
  return String(e)
}

async function collectTracksForMeta(
  meta: readonly LibraryRootMeta[],
  handles: ReadonlyMap<string, FileSystemDirectoryHandle>,
): Promise<CollectTracksResult> {
  const list: Track[] = []
  let failedRootCount = 0
  let firstError: string | null = null
  for (const r of meta) {
    const h = handles.get(r.id)
    if (!h) continue
    try {
      const chunk = await scanDirectoryForTracks(r.id, r.name, h)
      list.push(...chunk)
    } catch (e) {
      failedRootCount += 1
      if (!firstError) firstError = scanFailureMessage(e)
    }
  }
  list.sort((a, b) => {
    const ra = a.library?.rootId ?? ''
    const rb = b.library?.rootId ?? ''
    const c = ra.localeCompare(rb, undefined, { sensitivity: 'base' })
    if (c !== 0) return c
    const pa = a.library?.relativePath ?? a.title
    const pb = b.library?.relativePath ?? b.title
    return pa.localeCompare(pb, undefined, { sensitivity: 'base' })
  })
  return { tracks: list, failedRootCount, firstError }
}

const DISK_ACCESS_HINT =
  'Use Rescan all in Library settings, or remove and add the folders again so the browser can access your music.'

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
  const favoritesReadyRef = useRef(false)
  const [favoriteSongIds, setFavoriteSongIds] = useState<string[]>([])
  const [favoriteArtistNames, setFavoriteArtistNames] = useState<string[]>([])
  const [favoriteAlbumKeys, setFavoriteAlbumKeys] = useState<string[]>([])
  const [roots, setRoots] = useState<LibraryRootMeta[]>([])
  const [libraryTracks, setLibraryTracks] = useState<Track[]>([])
  const [queue, setQueue] = useState<QueuedTrack[]>([])
  const [recentlyPlayedTrackIds, setRecentlyPlayedTrackIds] = useState<string[]>([])
  const [isScanning, setIsScanning] = useState(false)
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
    }
  }, [])

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

  const runScan = useCallback(async (withUserActivation = false): Promise<void> => {
    if (scanLockRef.current) return
    scanLockRef.current = true
    const meta = rootsMetaRef.current
    const map = rootHandlesRef.current
    try {
      if (meta.length > 0) {
        await reconfirmReadAccessForHandles(map, withUserActivation)
      }
      setIsScanning(true)
      setScanError(null)
      const { tracks: next, failedRootCount, firstError } = await collectTracksForMeta(meta, map)
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
    } catch (e) {
      setScanError(e instanceof Error ? e.message : 'Scan failed')
    } finally {
      scanLockRef.current = false
      setIsScanning(false)
    }
  }, [])

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

  const removeFromQueue = useCallback((queueId: string) => {
    setQueue((prev) => prev.filter((q) => q.queueId !== queueId))
  }, [])

  const clearQueue = useCallback(() => {
    setQueue([])
  }, [])

  const recordRecentlyPlayedTrack = useCallback((trackId: string) => {
    const id = trackId.trim()
    if (!id) return
    setRecentlyPlayedTrackIds((prev) => {
      const next = [id, ...prev.filter((x) => x !== id)]
      return next.slice(0, RECENTLY_PLAYED_LIMIT)
    })
  }, [])

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
        let cachedApplied = false
        try {
          const cached = await idbGetCatalog(db)
          if (
            !disposed &&
            cached &&
            meta.length > 0 &&
            catalogMatchesRoots(meta, cached.rootIds)
          ) {
            setLibraryTracks(cached.tracks)
            cachedApplied = true
          }
        } catch {
          /* ignore missing or corrupt catalog */
        }
        if (disposed) return
        setIsScanning(true)
        setScanError(null)
        if (meta.length > 0) {
          await reconfirmReadAccessForHandles(map, false)
        }
        if (disposed) return
        const { tracks: next, firstError, failedRootCount } = await collectTracksForMeta(meta, map)
        if (disposed) return
        const needsGesture = next.length === 0 && meta.length > 0 && failedRootCount > 0
        if (needsGesture) {
          if (cachedApplied) {
            setScanError(null)
          } else {
            setLibraryTracks(next)
            try {
              await idbPutCatalog(db, meta.map((r) => r.id), next)
            } catch {
              /* ignore */
            }
            setScanError(firstError ? `${firstError} ${DISK_ACCESS_HINT}` : DISK_ACCESS_HINT)
          }
        } else {
          setLibraryTracks(next)
          try {
            await idbPutCatalog(db, meta.map((r) => r.id), next)
          } catch {
            /* ignore */
          }
        }
      } catch (e) {
        if (!disposed) {
          setScanError(e instanceof Error ? e.message : 'Could not load library')
        }
      } finally {
        if (!disposed) setIsScanning(false)
      }
    })()
    return (): void => {
      disposed = true
    }
  }, [])

  const value = useMemo(
    () => ({
      roots,
      libraryTracks,
      queue,
      recentlyPlayedTrackIds,
      isScanning,
      scanError,
      hasDirectoryPicker,
      addLibraryFolder,
      removeLibraryFolder,
      rescanAll,
      addToQueue,
      removeFromQueue,
      clearQueue,
      recordRecentlyPlayedTrack,
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
      isScanning,
      scanError,
      hasDirectoryPicker,
      addLibraryFolder,
      removeLibraryFolder,
      rescanAll,
      addToQueue,
      removeFromQueue,
      clearQueue,
      recordRecentlyPlayedTrack,
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

  return <LibraryContext.Provider value={value}>{props.children}</LibraryContext.Provider>
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
