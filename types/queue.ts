import type { Track } from "@/types/track";

/** One row in the playback queue (same library track may appear more than once). */
export type QueuedTrack = {
  queueId: string;
  track: Track;
};
