'use client'

import { useLibrary } from '@/components/LibraryProvider'
import { LIBRARY_AUDIO_EXTENSIONS } from '@/lib/library/constants'
import defaultLibraryScanPreferences from '@/lib/library/default-library-scan-preferences'
import SettingsSwitchRow from '@/components/SettingsSwitchRow'
import type { LibraryScanPreferences } from '@/types/library-scan-preferences'

const DEPTH_OPTIONS: readonly { value: number; label: string }[] = [
  { value: 0, label: 'Unlimited' },
  { value: 1, label: '1 level' },
  { value: 2, label: '2 levels' },
  { value: 3, label: '3 levels' },
  { value: 5, label: '5 levels' },
  { value: 10, label: '10 levels' },
]

/**
 * Scan depth, symlink follow, and per-extension include toggles.
 */
export default function LibraryScanOptionsSection() {
  const { scanPreferences, setScanPreferences, isScanning } = useLibrary()

  const patch = (partial: Partial<LibraryScanPreferences>): void => {
    setScanPreferences({ ...scanPreferences, ...partial })
  }

  const toggleExtension = (ext: string): void => {
    const enabled = new Set(scanPreferences.enabledExtensions)
    if (enabled.has(ext)) {
      if (enabled.size <= 1) return
      enabled.delete(ext)
    } else {
      enabled.add(ext)
    }
    patch({ enabledExtensions: [...enabled].sort() })
  }

  const resetExtensions = (): void => {
    patch({ enabledExtensions: defaultLibraryScanPreferences().enabledExtensions })
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
      <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">Scan options</h3>
      <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        Applied on the next rescan. Symlink handling depends on your browser; when enabled, Muzical skips
        directory cycles it can detect.
      </p>

      <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <label className="block min-w-0 flex-1">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Scan depth</span>
          <select
            value={scanPreferences.maxScanDepth}
            disabled={isScanning}
            onChange={(e) => patch({ maxScanDepth: Number.parseInt(e.target.value, 10) })}
            className="mt-2 block w-full max-w-xs rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
            aria-label="Maximum subdirectory scan depth"
          >
            {DEPTH_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-6 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <SettingsSwitchRow
          title="Follow symlinks"
          description="Follow directory links when the browser exposes them as folders. May increase scan time."
          checked={scanPreferences.followSymlinks}
          onChange={(followSymlinks) => patch({ followSymlinks })}
          ariaLabel="Follow directory symlinks when scanning"
        />
      </div>

      <div className="mt-6 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h4 className="text-xs font-medium uppercase tracking-wider text-zinc-500">File types</h4>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Only checked extensions are included in library scans.
            </p>
          </div>
          <button
            type="button"
            disabled={isScanning}
            onClick={resetExtensions}
            className="shrink-0 text-xs font-medium text-amber-700 hover:text-amber-600 disabled:opacity-50 dark:text-amber-400 dark:hover:text-amber-300"
          >
            Enable all
          </button>
        </div>
        <ul
          className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4"
          role="group"
          aria-label="Audio file extensions to scan"
        >
          {LIBRARY_AUDIO_EXTENSIONS.map((ext) => {
            const on = scanPreferences.enabledExtensions.includes(ext)
            return (
              <li key={ext}>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800/60">
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={isScanning}
                    onChange={() => toggleExtension(ext)}
                    className="h-4 w-4 rounded border-zinc-300 text-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-zinc-700 dark:bg-zinc-900"
                  />
                  <span className="font-mono text-xs text-zinc-800 dark:text-zinc-200">{ext}</span>
                </label>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
