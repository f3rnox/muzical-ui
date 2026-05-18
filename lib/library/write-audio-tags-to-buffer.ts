import type { AudioTagFields } from "@/types/audio-tag-fields";
import detectAudioTagFormat from "@/lib/library/detect-audio-tag-format";
import writeMp3TagsToBuffer from "@/lib/library/write-mp3-tags-to-buffer";

/**
 * Update embedded tags in an audio file buffer (MP3).
 */
export default async function writeAudioTagsToBuffer(
  file: File,
  fields: AudioTagFields,
): Promise<ArrayBuffer> {
  const format = detectAudioTagFormat(file);
  if (format !== "mp3") {
    throw new Error("Unsupported file format");
  }
  const source = await file.arrayBuffer();
  return writeMp3TagsToBuffer(source, fields);
}
