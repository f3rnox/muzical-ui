'use client'

import { useSearchParams } from 'next/navigation'
import LibraryBrowser from '@/components/LibraryBrowser'
import MusicBrainzBrowser from '@/components/MusicBrainzBrowser'
import YouTubeSearchBrowser from '@/components/YouTubeSearchBrowser'
import parseBrowseView from '@/lib/browse/parse-browse-view'
import useApplyDefaultBrowseView from '@/lib/browse/use-apply-default-browse-view'

export type { BrowseView } from '@/types/browse-view'

/**
 * Left-panel shell: library, MusicBrainz, or YouTube browse (view from URL).
 */
export default function BrowsePanel() {
  const searchParams = useSearchParams()
  useApplyDefaultBrowseView()
  const view = parseBrowseView(searchParams.get('view'))

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      {view === 'library' ? (
        <LibraryBrowser />
      ) : view === 'musicbrainz' ? (
        <MusicBrainzBrowser />
      ) : (
        <YouTubeSearchBrowser />
      )}
    </div>
  )
}
