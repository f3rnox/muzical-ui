import type { BrowseView } from '@/types/browse-view'

/**
 * Parse `?view=` into the active browse tab.
 */
export default function parseBrowseView(raw: string | null): BrowseView {
  if (raw === 'musicbrainz' || raw === 'youtube' || raw === 'browser') return raw
  return 'library'
}
