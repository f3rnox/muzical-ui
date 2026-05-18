/** UI debounce before firing a YouTube search (ms). */
export const YOUTUBE_SEARCH_DEBOUNCE_MS = 500;

/** Minimum gap between YouTube Data API v3 HTTP calls (ms). */
export const YOUTUBE_DATA_API_MIN_INTERVAL_MS = 900;

/** Minimum gap between server scrape requests (ms). */
export const YOUTUBE_SCRAPE_MIN_INTERVAL_MS = 2000;

/** How long search results stay in the in-memory cache (ms). */
export const YOUTUBE_SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;

/** Default max videos returned from a search. */
export const YOUTUBE_SEARCH_MAX_RESULTS = 20;

/** Videos fetched per page in browse search (initial + load more). */
export const YOUTUBE_SEARCH_PAGE_SIZE = 20;
