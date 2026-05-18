let blocked = false

/**
 * Whether Data API v3 lookups are disabled (e.g. after quota exhaustion).
 */
export default function readYoutubeDataApiBlocked(): boolean {
  return blocked
}

export function setYoutubeDataApiBlockedInternal(next: boolean): void {
  blocked = next
}
