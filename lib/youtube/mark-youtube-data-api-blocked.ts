import { setYoutubeDataApiBlockedInternal } from '@/lib/youtube/read-youtube-data-api-blocked'

/**
 * Disables further YouTube Data API v3 search requests for this session.
 */
export default function markYoutubeDataApiBlocked(): void {
  setYoutubeDataApiBlockedInternal(true)
}
