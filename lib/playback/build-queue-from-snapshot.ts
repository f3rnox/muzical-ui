import type { PersistedPlaybackSnapshot } from "@/types/persisted-playback-snapshot";
import type { QueuedTrack } from "@/types/queue";
import type { Track } from "@/types/track";

export type RestoredQueue = {
  queue: QueuedTrack[];
  activeQueueId: string | null;
  positionSec: number;
  wasPlaying: boolean;
};

/**
 * Rebuilds a playback queue from a snapshot and the current library catalog.
 */
export default function buildQueueFromSnapshot(
  libraryCatalog: readonly Track[],
  snapshot: PersistedPlaybackSnapshot,
): RestoredQueue {
  const libraryById = new Map<string, Track>();
  for (const t of libraryCatalog) libraryById.set(t.id, t);

  const resolvedTracks: Track[] = [];
  if (snapshot.tracks && snapshot.tracks.length > 0) {
    for (const row of snapshot.tracks) {
      resolvedTracks.push(libraryById.get(row.id) ?? row);
    }
  } else {
    for (const trackId of snapshot.trackIds) {
      const track = libraryById.get(trackId);
      if (track) resolvedTracks.push(track);
    }
  }

  const queue: QueuedTrack[] = resolvedTracks.map((track) => ({
    queueId: crypto.randomUUID(),
    track,
  }));
  let activeQueueId: string | null = null;
  if (
    snapshot.activeQueueIndex != null &&
    snapshot.activeQueueIndex >= 0 &&
    snapshot.activeQueueIndex < queue.length
  ) {
    activeQueueId = queue[snapshot.activeQueueIndex]?.queueId ?? null;
  } else if (snapshot.activeTrackId) {
    const row = queue.find((q) => q.track.id === snapshot.activeTrackId);
    activeQueueId = row?.queueId ?? queue[0]?.queueId ?? null;
  } else {
    activeQueueId = queue[0]?.queueId ?? null;
  }
  return {
    queue,
    activeQueueId,
    positionSec: snapshot.positionSec,
    wasPlaying: snapshot.wasPlaying === true,
  };
}
