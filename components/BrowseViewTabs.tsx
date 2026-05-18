'use client'

import { useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export type BrowseView = 'library' | 'musicbrainz'

const BROWSE_VIEWS: readonly BrowseView[] = ['library', 'musicbrainz']

/**
 * Library / MusicBrainz view switcher (URL: ?view=musicbrainz).
 */
export default function BrowseViewTabs() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const view: BrowseView = searchParams.get('view') === 'musicbrainz' ? 'musicbrainz' : 'library'

  const setView = useCallback(
    (next: BrowseView) => {
      const params = new URLSearchParams(searchParams.toString())
      if (next === 'musicbrainz') {
        params.set('view', 'musicbrainz')
      } else {
        params.delete('view')
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
            'cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium capitalize transition',
            view === id
              ? 'bg-amber-500 text-zinc-950'
              : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700',
          ].join(' ')}
        >
          {id === 'musicbrainz' ? 'MusicBrainz' : 'Library'}
        </button>
      ))}
    </div>
  )
}
