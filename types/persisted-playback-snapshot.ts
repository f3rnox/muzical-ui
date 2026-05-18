/** Saved queue and playhead for “remember last track / queue”. */
export type PersistedPlaybackSnapshot = {
  trackIds: string[];
  activeTrackId: string | null;
  positionSec: number;
};
