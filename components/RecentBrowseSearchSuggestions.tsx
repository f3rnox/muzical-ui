'use client'

import { useMemo } from 'react'
import { useLibrary } from '@/components/LibraryProvider'
import { RECENT_BROWSE_SEARCHES_LIMIT } from '@/lib/browse/browse-search-constants'
import filterRecentBrowseSearchesBySource from '@/lib/browse/filter-recent-browse-searches-by-source'
import type { BrowseSearchSource } from '@/types/browse-search'

type RecentBrowseSearchSuggestionsProps = {
  source: BrowseSearchSource
  onSelect: (query: string) => void
  limit?: number
}

const CHIP_CLASS =
  'max-w-full min-w-0 cursor-pointer truncate rounded-full border border-zinc-200 bg-white px-3 py-1 text-left text-xs font-medium text-zinc-800 shadow-sm transition hover:border-accent-400/50 hover:bg-accent-50/50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-accent-500/30 dark:hover:bg-accent-950/20'

/**
 * Recent search chips shown below a browse search input.
 */
export default function RecentBrowseSearchSuggestions(props: RecentBrowseSearchSuggestionsProps) {
  const { recentBrowseSearches } = useLibrary()
  const limit = props.limit ?? Math.min(8, RECENT_BROWSE_SEARCHES_LIMIT)

  const entries = useMemo(
    () => filterRecentBrowseSearchesBySource(recentBrowseSearches, props.source, limit),
    [recentBrowseSearches, props.source, limit],
  )

  if (entries.length === 0) return null

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Recent searches</p>
      <div className="flex flex-wrap gap-1.5" role="list" aria-label="Recent searches">
        {entries.map((entry) => (
          <button
            key={`${entry.source}\u0000${entry.query}`}
            type="button"
            role="listitem"
            className={CHIP_CLASS}
            onClick={() => props.onSelect(entry.query)}
          >
            {entry.query}
          </button>
        ))}
      </div>
    </div>
  )
}
