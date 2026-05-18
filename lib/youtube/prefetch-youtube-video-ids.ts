import readYoutubeDataApiBlocked from "@/lib/youtube/read-youtube-data-api-blocked";
import resolveYoutubeVideoId from "@/lib/youtube/resolve-youtube-video-id";

export type YoutubePrefetchTarget = {
  trackId: string;
  query: string;
};

type PrefetchYoutubeVideoIdsOptions = {
  signal?: AbortSignal;
  maxConcurrent?: number;
};

/**
 * Resolves YouTube video ids for many tracks concurrently (Data API v3).
 */
export default async function prefetchYoutubeVideoIds(
  targets: readonly YoutubePrefetchTarget[],
  onResolved: (trackId: string, videoId: string) => void,
  options: PrefetchYoutubeVideoIdsOptions = {},
): Promise<void> {
  if (targets.length === 0 || readYoutubeDataApiBlocked()) return;

  const maxConcurrent =
    typeof options.maxConcurrent === 'number' && options.maxConcurrent > 0
      ? Math.floor(options.maxConcurrent)
      : 2
  const signal = options.signal;
  let index = 0;

  const worker = async (): Promise<void> => {
    while (index < targets.length) {
      if (signal?.aborted) return;
      const i = index;
      index += 1;
      const target = targets[i];
      if (readYoutubeDataApiBlocked()) return;
      let videoId: string | null = null;
      try {
        videoId = await resolveYoutubeVideoId(target.query, signal);
      } catch {
        continue;
      }
      if (signal?.aborted || readYoutubeDataApiBlocked() || !videoId) continue;
      onResolved(target.trackId, videoId);
    }
  };

  const workers = Array.from(
    { length: Math.min(maxConcurrent, targets.length) },
    () => worker(),
  );
  await Promise.all(workers);
}
