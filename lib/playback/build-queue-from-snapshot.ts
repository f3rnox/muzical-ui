import type { PersistedPlaybackSnapshot } from "@/types/persisted-playback-snapshot";
import type { QueuedTrack } from "@/types/queue";
import type { Track } from "@/types/track";

export type RestoredQueue = {
  queue: QueuedTrack[];
  activeQueueId: string | null;
  positionSec: number;
};

/**
 * Rebuilds a playback queue from a snapshot and the current library catalog.
 */
export default function buildQueueFromSnapshot(
  tracks: readonly Track[],
  snapshot: PersistedPlaybackSnapshot,
): RestoredQueue {
  const byId = new Map<string, Track>();
  for (const t of tracks) byId.set(t.id, t);
  const queue: QueuedTrack[] = [];
  for (const trackId of snapshot.trackIds) {
    const track = byId.get(trackId);
    if (!track) continue;
    queue.push({ queueId: crypto.randomUUID(), track });
  }
  let activeQueueId: string | null = null;
  if (snapshot.activeTrackId) {
    const row = queue.find((q) => q.track.id === snapshot.activeTrackId);
    activeQueueId = row?.queueId ?? queue[0]?.queueId ?? null;
  } else {
    activeQueueId = queue[0]?.queueId ?? null;
  }
  return {
    queue,
    activeQueueId,
    positionSec: snapshot.positionSec,
  };
}
