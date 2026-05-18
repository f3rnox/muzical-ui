import type { Track } from "@/types/track";
import type { AudioTagFields } from "@/types/audio-tag-fields";
import type { WriteAudioTagsResult } from "@/types/write-audio-tags-result";
import ensureDirectoryWriteAccess from "@/lib/library/ensure-directory-write-access";
import resolveTrackToFileHandle from "@/lib/library/resolve-track-file-handle";
import detectAudioTagFormat from "@/lib/library/detect-audio-tag-format";
import writeAudioTagsToBuffer from "@/lib/library/write-audio-tags-to-buffer";

/**
 * Write title, artist, and album tags to a library track file on disk.
 */
export default async function writeAudioTagsToFile(
  track: Track,
  fields: AudioTagFields,
  rootHandles: ReadonlyMap<string, FileSystemDirectoryHandle>,
  mayRequestPrompt: boolean,
): Promise<WriteAudioTagsResult> {
  if (!track.library) {
    return {
      ok: false,
      reason: "Only local library files can be tagged on disk.",
    };
  }
  const root = rootHandles.get(track.library.rootId);
  if (!root) {
    return {
      ok: false,
      reason: "Library folder is not available. Try rescanning.",
    };
  }
  const canWrite = await ensureDirectoryWriteAccess(root, mayRequestPrompt);
  if (!canWrite) {
    return {
      ok: false,
      reason:
        "Write permission is required. Re-add the library folder or allow write access when prompted.",
    };
  }
  const handle = await resolveTrackToFileHandle(track, rootHandles);
  if (!handle) {
    return { ok: false, reason: "Could not open the audio file." };
  }
  const file = await handle.getFile();
  if (!detectAudioTagFormat(file)) {
    return {
      ok: false,
      reason: "Tag writing is supported for MP3 files only.",
    };
  }
  let nextBuffer: ArrayBuffer;
  try {
    nextBuffer = await writeAudioTagsToBuffer(file, fields);
  } catch {
    return {
      ok: false,
      reason: "Failed to update embedded tags in this file.",
    };
  }
  try {
    const writable = await handle.createWritable();
    await writable.write(nextBuffer);
    await writable.close();
  } catch {
    return { ok: false, reason: "Could not save tags to the file." };
  }
  return { ok: true };
}
