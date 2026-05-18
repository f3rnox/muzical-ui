/**
 * Returns true when a YouTube Data API error message indicates quota exhaustion.
 */
export default function isYoutubeQuotaErrorMessage(message: string): boolean {
  const m = message.toLowerCase()
  return m.includes('quota') || m.includes('quotaexceeded')
}
