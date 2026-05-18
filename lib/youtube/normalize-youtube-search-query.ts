/**
 * Normalize a YouTube search query for cache keys and deduplication.
 */
export default function normalizeYoutubeSearchQuery(query: string): string {
  return query.trim().toLowerCase()
}
