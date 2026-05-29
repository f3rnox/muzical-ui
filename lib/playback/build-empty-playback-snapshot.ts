import type { PersistedPlaybackSnapshot } from "@/types/persisted-playback-snapshot";

/**
 * Snapshot for a cleared queue when “remember last queue” is enabled.
 */
export default function buildEmptyPlaybackSnapshot(): PersistedPlaybackSnapshot {
  return {
    trackIds: [],
    tracks: [],
    activeTrackId: null,
    activeQueueIndex: null,
    positionSec: 0,
    wasPlaying: false,
  };
}
