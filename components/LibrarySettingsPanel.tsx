'use client'

import { useLibrary } from '@/components/LibraryProvider'
import formatLibraryRootAdded from '@/components/format-library-root-added'
import LibraryScanOptionsSection from '@/components/LibraryScanOptionsSection'
import LibraryStatistics from '@/components/LibraryStatistics'
import SettingsSwitchRow from '@/components/SettingsSwitchRow'

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
  } = useLibrary()

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Library</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Folders are read in the browser via the File System Access API.
        </p>
      </div>

      <LibraryStatistics roots={roots} libraryTracks={libraryTracks} />

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
          <p className="mt-3 text-sm text-amber-800 dark:text-amber-300">
            Folder selection is not available in this environment. Use Chrome or Edge on desktop.
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => addLibraryFolder()}
            disabled={!hasDirectoryPicker || isScanning}
            className="rounded-full bg-amber-500 px-4 py-2 text-sm font-medium text-zinc-950 shadow-sm transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
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
