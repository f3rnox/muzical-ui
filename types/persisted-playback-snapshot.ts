import type { Track } from '@/types/track'

/** Saved queue and playhead for “remember last track / queue”. */
export type PersistedPlaybackSnapshot = {
  /** Legacy; kept when writing for older readers. */
  trackIds: string[];
  /** Full queue tracks in order (includes MusicBrainz and other non-library rows). */
  tracks?: Track[];
  activeTrackId: string | null;
  positionSec: number;
};
