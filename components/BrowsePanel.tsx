'use client'

import { useSearchParams } from 'next/navigation'
import LibraryBrowser from '@/components/LibraryBrowser'
import MusicBrainzBrowser from '@/components/MusicBrainzBrowser'

export type { BrowseView } from '@/components/BrowseViewTabs'

/**
 * Left-panel shell: local library browse or MusicBrainz discovery (view from URL).
 */
export default function BrowsePanel() {
  const searchParams = useSearchParams()
  const view = searchParams.get('view') === 'musicbrainz' ? 'musicbrainz' : 'library'

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      {view === 'library' ? <LibraryBrowser /> : <MusicBrainzBrowser />}
    </div>
  )
}

