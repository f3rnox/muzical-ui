import type { ExtractedCoverBytes } from "@/lib/library/extract-cover-bytes-from-audio-file";
import { extractCoverBytesFromAudioFile } from "@/lib/library/extract-cover-bytes-from-audio-file";

const COVER_BYTES_CACHE_MAX = 48;

type CacheEntry = {
  bytes: ExtractedCoverBytes;
  lastUsedAt: number;
};

const cache = new Map<string, CacheEntry>();
const pendingByTrackId = new Map<string, Promise<ExtractedCoverBytes | null>>();

function touchEntry(trackId: string, entry: CacheEntry): void {
  cache.delete(trackId);
  cache.set(trackId, entry);
}

function evictIfNeeded(): void {
  while (cache.size > COVER_BYTES_CACHE_MAX) {
    const oldestKey = cache.keys().next().value as string | undefined;
    if (!oldestKey) return;
    cache.delete(oldestKey);
  }
}

/**
 * Returns embedded cover bytes for a track, extracting on first use and caching in-memory.
 */
export async function getCoverBytesForTrack(
  trackId: string,
  file: File,
): Promise<ExtractedCoverBytes | null> {
  const cached = cache.get(trackId);
  if (cached) {
    touchEntry(trackId, { ...cached, lastUsedAt: Date.now() });
    return cached.bytes;
  }

  const pending = pendingByTrackId.get(trackId);
  if (pending) return pending;

  const p = (async (): Promise<ExtractedCoverBytes | null> => {
    const bytes = await extractCoverBytesFromAudioFile(file);
    if (bytes) {
      const entry: CacheEntry = { bytes, lastUsedAt: Date.now() };
      cache.set(trackId, entry);
      evictIfNeeded();
    }
    return bytes;
  })();

  pendingByTrackId.set(trackId, p);
  try {
    return await p;
  } finally {
    pendingByTrackId.delete(trackId);
  }
}
