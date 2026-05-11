'use client'

import Link from 'next/link'
import { useLibrary } from '@/components/LibraryProvider'
import ThemeToggle from '@/components/ThemeToggle'

function formatAdded(ts: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(ts))
  } catch {
    return new Date(ts).toLocaleString()
  }
}

/**
 * Settings UI: add/remove scan directories and trigger a full rescan.
 */
export default function LibrarySettingsPage() {
  const {
    roots,
    libraryTracks,
    isScanning,
    scanError,
    hasDirectoryPicker,
    addLibraryFolder,
    removeLibraryFolder,
    rescanAll,
    compactLists,
    setCompactLists,
  } = useLibrary()

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-zinc-100 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-zinc-200 bg-white/90 px-6 py-4 backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-950/90">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            className="shrink-0 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            ← Player
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold tracking-tight">Library settings</h1>
            <p className="truncate text-xs text-zinc-500">
              Folders are read in the browser via the File System Access API.
            </p>
          </div>
        </div>
        <ThemeToggle />
      </header>

      <main className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col gap-8 overflow-y-auto overscroll-contain px-6 py-8">
        {scanError ? (
          <p
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
            role="alert"
          >
            {scanError}
          </p>
        ) : null}

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
          <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">Scan directories</h2>
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

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="flex items-baseline justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">List density</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                Compact lists show tighter spacing in the player and library browser.
              </p>
            </div>
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={compactLists}
                onChange={(e) => setCompactLists(e.target.checked)}
                aria-label="Enable compact lists"
                className="h-4 w-4 rounded border-zinc-300 text-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-zinc-700 dark:bg-zinc-900"
              />
              <span className="shrink-0 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                {compactLists ? 'Compact' : 'Comfortable'}
              </span>
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">Configured folders</h2>
            <span className="text-xs tabular-nums text-zinc-500">
              {libraryTracks.length} track{libraryTracks.length === 1 ? '' : 's'}
            </span>
          </div>
          {roots.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">No folders yet. Add a library folder above.</p>
          ) : (
            <ul className="mt-4 divide-y divide-zinc-200 dark:divide-zinc-800" role="list">
              {roots.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">{r.name}</p>
                    <p className="truncate text-xs text-zinc-500">Added {formatAdded(r.addedAt)}</p>
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
      </main>
    </div>
  )
}
