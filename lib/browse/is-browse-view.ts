import type { BrowseView } from '@/types/browse-view'

/**
 * Type guard for stored browse view values.
 */
export default function isBrowseView(value: unknown): value is BrowseView {
  return value === 'library' || value === 'musicbrainz' || value === 'youtube'
}
