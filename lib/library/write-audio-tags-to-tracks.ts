import type { Track } from "@/types/track";
import type { WriteAudioTagsBulkResult } from "@/types/write-audio-tags-result";
import writeAudioTagsToFile from "@/lib/library/write-audio-tags-to-file";

/**
 * Write embedded tags for each library track in a list.
 */
export default async function writeAudioTagsToTracks(
  tracks: readonly Track[],
  rootHandles: ReadonlyMap<string, FileSystemDirectoryHandle>,
  mayRequestPrompt: boolean,
): Promise<WriteAudioTagsBulkResult> {
  let writtenCount = 0;
  let failedCount = 0;
  let reason: string | null = null;
  for (const track of tracks) {
    if (!track.library) continue;
    const result = await writeAudioTagsToFile(
      track,
      { title: track.title, artist: track.artist, album: track.album },
      rootHandles,
      mayRequestPrompt && writtenCount === 0 && failedCount === 0,
    );
    if (result.ok) {
      writtenCount += 1;
    } else {
      failedCount += 1;
      if (!reason) reason = result.reason;
    }
  }
  return {
    ok: failedCount === 0,
    writtenCount,
    failedCount,
    reason,
  };
}
