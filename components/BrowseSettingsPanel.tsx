'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLibrary } from '@/components/LibraryProvider'
import readStoredDefaultBrowseView from '@/lib/browse/read-stored-default-browse-view'
import writeStoredDefaultBrowseView from '@/lib/browse/write-stored-default-browse-view'
import type { BrowseView } from '@/types/browse-view'

const BROWSE_VIEW_OPTIONS: readonly { value: BrowseView; label: string }[] = [
  { value: 'library', label: 'Library' },
  { value: 'musicbrainz', label: 'MusicBrainz' },
  { value: 'youtube', label: 'YouTube' },
]

const FIELD_CLASS =
  'mt-2 block w-full max-w-xs rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100'

/**
 * Browse tab defaults and related options.
 */
export default function BrowseSettingsPanel() {
  const { recentBrowseSearches, clearRecentBrowseSearches } = useLibrary()
  const [defaultBrowseView, setDefaultBrowseView] = useState<BrowseView>('library')

  useEffect(() => {
    queueMicrotask(() => {
      setDefaultBrowseView(readStoredDefaultBrowseView())
    })
  }, [])

  const onDefaultBrowseViewChange = useCallback((view: BrowseView) => {
    setDefaultBrowseView(view)
    writeStoredDefaultBrowseView(view)
  }, [])

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Browse</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Default browse tab and recent MusicBrainz / YouTube search history.
        </p>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
        <label className="block min-w-0">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Default browse view</span>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Applied when you open the home page without a <span className="font-mono text-xs">view</span> link in the
            URL. You can still switch tabs anytime from the player header.
          </p>
          <select
            value={defaultBrowseView}
            onChange={(e) => onDefaultBrowseViewChange(e.target.value as BrowseView)}
            className={FIELD_CLASS}
            aria-label="Default browse view"
          >
            {BROWSE_VIEW_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
        <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">Recent searches</h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Clears recent Library, MusicBrainz, and YouTube search chips shown on the home queue panel (
          {recentBrowseSearches.length === 1 ? '1 saved' : `${recentBrowseSearches.length} saved`}).
        </p>
        <button
          type="button"
          onClick={() => clearRecentBrowseSearches()}
          disabled={recentBrowseSearches.length === 0}
          className="mt-4 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
        >
          Clear recent searches
        </button>
      </section>
    </div>
  )
}
