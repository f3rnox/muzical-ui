import { ID3Writer } from "browser-id3-writer";
import type { AudioTagFields } from "@/types/audio-tag-fields";

/**
 * Embed ID3v2 tags into an MP3 buffer.
 */
export default function writeMp3TagsToBuffer(
  source: ArrayBuffer,
  fields: AudioTagFields,
): ArrayBuffer {
  const writer = new ID3Writer(source);
  writer.setFrame("TIT2", fields.title.trim());
  writer.setFrame("TPE1", [fields.artist.trim()]);
  const album = fields.album.trim();
  if (album) writer.setFrame("TALB", album);
  return writer.addTag();
}
