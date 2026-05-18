import isYoutubeQuotaErrorMessage from "@/lib/youtube/is-youtube-quota-error-message";

/**
 * True when an error indicates YouTube Data API quota exhaustion.
 */
export default function isYoutubeQuotaError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return isYoutubeQuotaErrorMessage(err.message);
}
