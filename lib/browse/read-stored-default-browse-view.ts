import defaultBrowseView from '@/lib/browse/default-browse-view'
import { DEFAULT_BROWSE_VIEW_STORAGE_KEY } from '@/lib/browse/browse-search-constants'
import isBrowseView from '@/lib/browse/is-browse-view'
import type { BrowseView } from '@/types/browse-view'

/**
 * Loads the default browse view from localStorage.
 */
export default function readStoredDefaultBrowseView(): BrowseView {
  if (typeof window === 'undefined') return defaultBrowseView()
  try {
    const raw = window.localStorage.getItem(DEFAULT_BROWSE_VIEW_STORAGE_KEY)
    if (isBrowseView(raw)) return raw
    return defaultBrowseView()
  } catch {
    return defaultBrowseView()
  }
}
