import { YOUTUBE_API_KEY_CHANGED_EVENT } from "@/lib/youtube/youtube-api-key-changed-event";

/**
 * Notify listeners that YouTube API key availability may have changed.
 */
export default function notifyYoutubeApiKeyChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(YOUTUBE_API_KEY_CHANGED_EVENT));
}
