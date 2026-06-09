'use client'

import { useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import parseBrowseView from '@/lib/browse/parse-browse-view'
import type { BrowseView } from '@/types/browse-view'

export type { BrowseView } from '@/types/browse-view'

export { default as parseBrowseView } from '@/lib/browse/parse-browse-view'

const BROWSE_VIEWS: readonly BrowseView[] = ['library', 'musicbrainz', 'youtube', 'browser']

function browseViewLabel(id: BrowseView): string {
  if (id === 'musicbrainz') return 'MusicBrainz'
  if (id === 'youtube') return 'YouTube'
  if (id === 'browser') return 'Browse'
  return 'Library'
}

/**
 * Library / MusicBrainz / YouTube view switcher (URL: ?view=…).
 */
export default function BrowseViewTabs() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const view = parseBrowseView(searchParams.get('view'))

  const setView = useCallback(
    (next: BrowseView) => {
      const params = new URLSearchParams(searchParams.toString())
      if (next === 'library') {
        params.delete('view')
      } else {
        params.set('view', next)
      }
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams],
  )

  return (
    <div
      className="flex items-center gap-1"
      role="tablist"
      aria-label="Browse source"
    >
      {BROWSE_VIEWS.map((id) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={view === id}
          onClick={() => setView(id)}
          className={[
            'cursor-pointer rounded-full px-2 py-1 text-[10px] font-medium transition whitespace-nowrap sm:px-3 sm:py-1 sm:text-xs',
            view === id
              ? 'bg-accent-500 text-zinc-950'
              : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700',
          ].join(' ')}
        >
          {browseViewLabel(id)}
        </button>
      ))}
    </div>
  )
}
