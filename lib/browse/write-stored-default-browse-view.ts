import { DEFAULT_BROWSE_VIEW_STORAGE_KEY } from '@/lib/browse/browse-search-constants'
import type { BrowseView } from '@/types/browse-view'

/**
 * Persists the default browse view to localStorage.
 */
export default function writeStoredDefaultBrowseView(view: BrowseView): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(DEFAULT_BROWSE_VIEW_STORAGE_KEY, view)
  } catch {
    /* ignore */
  }
}
