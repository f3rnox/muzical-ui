export type AudioTagFormat = "mp3" | "flac";

/**
 * Infer which embedded tag writer to use from a file name or MIME type.
 */
export default function detectAudioTagFormat(
  file: File,
): AudioTagFormat | null {
  const name = file.name.toLowerCase();
  if (name.endsWith(".mp3")) return "mp3";
  if (name.endsWith(".flac")) return "flac";
  const mime = file.type.toLowerCase();
  if (mime === "audio/mpeg" || mime === "audio/mp3") return "mp3";
  if (mime === "audio/flac" || mime === "audio/x-flac") return "flac";
  return null;
}
