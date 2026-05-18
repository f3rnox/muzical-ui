'use client'

import { useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export type BrowseView = 'library' | 'musicbrainz' | 'youtube'

const BROWSE_VIEWS: readonly BrowseView[] = ['library', 'musicbrainz', 'youtube']

function browseViewLabel(id: BrowseView): string {
  if (id === 'musicbrainz') return 'MusicBrainz'
  if (id === 'youtube') return 'YouTube'
  return 'Library'
}

/** Parse `?view=` into the active browse tab. */
export function parseBrowseView(raw: string | null): BrowseView {
  if (raw === 'musicbrainz' || raw === 'youtube') return raw
  return 'library'
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
            'cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition',
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
