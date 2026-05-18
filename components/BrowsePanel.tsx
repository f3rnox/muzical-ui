'use client'

import { useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import LibraryBrowser from '@/components/LibraryBrowser'
import MusicBrainzBrowser from '@/components/MusicBrainzBrowser'

export type BrowseView = 'library' | 'musicbrainz'

const BROWSE_VIEWS: readonly BrowseView[] = ['library', 'musicbrainz']

function parseBrowseView(raw: string | null): BrowseView {
  return raw === 'musicbrainz' ? 'musicbrainz' : 'library'
}

/**
 * Left-panel shell: switch between local library browse and MusicBrainz discovery.
 */
export default function BrowsePanel() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const view = parseBrowseView(searchParams.get('view'))

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
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 gap-1 border-b border-zinc-200 bg-white/80 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950/80">
        {BROWSE_VIEWS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            className={[
              'cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium capitalize transition',
              view === id
                ? 'bg-amber-500 text-zinc-950'
                : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700',
            ].join(' ')}
            aria-pressed={view === id}
          >
            {id === 'musicbrainz' ? 'MusicBrainz' : 'Library'}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        {view === 'library' ? <LibraryBrowser /> : <MusicBrainzBrowser />}
      </div>
    </div>
  )
}
