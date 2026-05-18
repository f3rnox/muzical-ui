"use client";

import { useMemo, useSyncExternalStore } from "react";
import readStoredYoutubeApiKey from "@/lib/youtube/read-stored-youtube-api-key";
import readYoutubeDataApiBlocked from "@/lib/youtube/read-youtube-data-api-blocked";
import { YOUTUBE_API_KEY_CHANGED_EVENT } from "@/lib/youtube/youtube-api-key-changed-event";

export type YoutubeApiKeyReadyState = {
  /** False during SSR / before client hydration. */
  checked: boolean;
  hasKey: boolean;
  blocked: boolean;
  ready: boolean;
};

type YoutubeApiKeyStatus = Omit<YoutubeApiKeyReadyState, "checked">;

const SERVER_SNAPSHOT: YoutubeApiKeyStatus = {
  hasKey: false,
  blocked: false,
  ready: false,
};

let cachedClientSnapshot: YoutubeApiKeyStatus = SERVER_SNAPSHOT;

/**
 * Cached getSnapshot for useSyncExternalStore (must keep referential equality when unchanged).
 */
function getYoutubeApiKeySnapshot(): YoutubeApiKeyStatus {
  const hasKey = readStoredYoutubeApiKey().trim().length > 0;
  const blocked = readYoutubeDataApiBlocked();
  const ready = hasKey && !blocked;
  if (
    cachedClientSnapshot.hasKey === hasKey &&
    cachedClientSnapshot.blocked === blocked &&
    cachedClientSnapshot.ready === ready
  ) {
    return cachedClientSnapshot;
  }
  cachedClientSnapshot = { hasKey, blocked, ready };
  return cachedClientSnapshot;
}

function subscribe(onStoreChange: () => void): () => void {
  const onChange = () => onStoreChange();
  window.addEventListener("focus", onChange);
  window.addEventListener("storage", onChange);
  window.addEventListener(YOUTUBE_API_KEY_CHANGED_EVENT, onChange);
  return () => {
    window.removeEventListener("focus", onChange);
    window.removeEventListener("storage", onChange);
    window.removeEventListener(YOUTUBE_API_KEY_CHANGED_EVENT, onChange);
  };
}

/**
 * Client-side YouTube API key availability (avoids SSR/localStorage false negatives).
 */
export default function useYoutubeApiKeyReady(): YoutubeApiKeyReadyState {
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const status = useSyncExternalStore(
    subscribe,
    getYoutubeApiKeySnapshot,
    () => SERVER_SNAPSHOT,
  );
  return useMemo(() => ({ checked: hydrated, ...status }), [hydrated, status]);
}
