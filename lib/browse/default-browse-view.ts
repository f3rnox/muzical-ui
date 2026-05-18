import type { BrowseView } from '@/types/browse-view'

/**
 * Default browse tab when opening Muzical without a `view` query param.
 */
export default function defaultBrowseView(): BrowseView {
  return 'library'
}
