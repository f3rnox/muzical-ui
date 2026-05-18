'use client'

import { useCallback, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useLibrary } from '@/components/LibraryProvider'
import formatLibraryRootAdded from '@/components/format-library-root-added'
import LibraryScanOptionsSection from '@/components/LibraryScanOptionsSection'
import LibraryStatistics from '@/components/LibraryStatistics'
import MusicBrainzLibraryStatistics from '@/components/MusicBrainzLibraryStatistics'
import SettingsSwitchRow from '@/components/SettingsSwitchRow'
import downloadFavoritesExportJson from '@/lib/favorites/download-favorites-export-json'
import parseFavoritesExportDocument from '@/lib/favorites/parse-favorites-export-document'

/**
 * Library settings: folders, rescan controls, and startup scan preference.
 */
export default function LibrarySettingsPanel() {
  const {
    roots,
    libraryTracks,
    isScanning,
    scanError,
    hasDirectoryPicker,
    addLibraryFolder,
    removeLibraryFolder,
    rescanAll,
    autoRescanOnStartup,
    setAutoRescanOnStartup,
    removeAllMusicBrainzFromLibrary,
    favoriteSongIds,
    favoriteArtistNames,
    favoriteAlbumKeys,
    importFavorites,
  } = useLibrary()

  const favoritesImportInputRef = useRef<HTMLInputElement>(null)
  const [favoritesImportError, setFavoritesImportError] = useState<string | null>(null)

  const favoritesCount = useMemo(
    () => favoriteSongIds.length + favoriteArtistNames.length + favoriteAlbumKeys.length,
    [favoriteSongIds, favoriteArtistNames, favoriteAlbumKeys],
  )

  const onExportFavorites = useCallback(() => {
    downloadFavoritesExportJson({
      songIds: favoriteSongIds,
      artistNames: favoriteArtistNames,
      albumKeys: favoriteAlbumKeys,
    })
  }, [favoriteSongIds, favoriteArtistNames, favoriteAlbumKeys])

  const onImportFavoritesClick = useCallback(() => {
    setFavoritesImportError(null)
    favoritesImportInputRef.current?.click()
  }, [])

  const onFavoritesImportFile = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      event.target.value = ''
      if (!file) return
      void file
        .text()
        .then((text) => {
          const parsed: unknown = JSON.parse(text)
          const doc = parseFavoritesExportDocument(parsed)
          if (!doc) {
            setFavoritesImportError('Invalid favorites file. Choose a JSON export from Muzical.')
            return
          }
          importFavorites(doc)
          setFavoritesImportError(null)
        })
        .catch(() => {
          setFavoritesImportError('Could not read the favorites file.')
        })
    },
    [importFavorites],
  )

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Library</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Folders are read in the browser via the File System Access API.
        </p>
      </div>

      <LibraryStatistics roots={roots} libraryTracks={libraryTracks} />

      <MusicBrainzLibraryStatistics
        libraryTracks={libraryTracks}
        onRemoveAll={removeAllMusicBrainzFromLibrary}
        disabled={isScanning}
      />

      {scanError ? (
        <p
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          {scanError}
        </p>
      ) : null}

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
        <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">Scan directories</h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Pick one or more folders that contain your audio files. Subfolders are scanned. Handles are stored in
          IndexedDB on this device so you do not have to pick them again on return visits.
        </p>
        {!hasDirectoryPicker ? (
          <p className="mt-3 text-sm text-accent-800 dark:text-accent-300">
            Folder selection is not available in this environment. Use Chrome or Edge on desktop.
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => addLibraryFolder()}
            disabled={!hasDirectoryPicker || isScanning}
            className="rounded-full bg-accent-500 px-4 py-2 text-sm font-medium text-zinc-950 shadow-sm transition hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add folder…
          </button>
          <button
            type="button"
            onClick={() => void rescanAll()}
            disabled={roots.length === 0 || isScanning}
            className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            {isScanning ? 'Scanning…' : 'Rescan all'}
          </button>
        </div>
      </section>

      <LibraryScanOptionsSection />

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
        <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">Configured folders</h3>
        {roots.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">No folders yet. Add a library folder above.</p>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-200 dark:divide-zinc-800" role="list">
            {roots.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0">
                <div className="min-w-0">
                  <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">{r.name}</p>
                  <p className="truncate text-xs text-zinc-500">Added {formatLibraryRootAdded(r.addedAt)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void removeLibraryFolder(r.id)}
                  disabled={isScanning}
                  className="shrink-0 rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
        <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">Favorites</h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Back up or restore starred songs, artists, and albums as JSON (stored in IndexedDB on this device,{' '}
          {favoritesCount === 1 ? '1 entry' : `${favoritesCount} entries`}). Import replaces your current favorites.
        </p>
        <input
          ref={favoritesImportInputRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          aria-hidden
          onChange={onFavoritesImportFile}
        />
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onExportFavorites}
            disabled={favoritesCount === 0}
            className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            Export favorites
          </button>
          <button
            type="button"
            onClick={onImportFavoritesClick}
            className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            Import favorites
          </button>
        </div>
        {favoritesImportError ? (
          <p className="mt-3 text-sm text-red-700 dark:text-red-300" role="alert">
            {favoritesImportError}
          </p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
        <SettingsSwitchRow
          title="Rescan on startup"
          description="When enabled, Muzical rescans all configured folders each time you open the app (if the browser already has folder access). When disabled, the last saved catalog loads immediately."
          checked={autoRescanOnStartup}
          onChange={setAutoRescanOnStartup}
          ariaLabel="Rescan library on startup"
        />
      </section>
    </div>
  )
}
