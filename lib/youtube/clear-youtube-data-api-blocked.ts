import { setYoutubeDataApiBlockedInternal } from '@/lib/youtube/read-youtube-data-api-blocked'

/**
 * Re-enables YouTube Data API v3 lookups (e.g. after saving a new API key).
 */
export default function clearYoutubeDataApiBlocked(): void {
  setYoutubeDataApiBlockedInternal(false)
}
