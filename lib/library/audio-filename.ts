import { LIBRARY_AUDIO_EXTENSIONS } from "@/lib/library/constants";

const extSet = new Set(LIBRARY_AUDIO_EXTENSIONS);

/**
 * Returns true when the file name looks like a supported audio file.
 */
export function isAudioFilename(name: string): boolean {
  const dot = name.lastIndexOf(".");
  if (dot < 0) return false;
  return extSet.has(name.slice(dot).toLowerCase());
}

/**
 * Strips a common audio extension for display as a title.
 */
export function stripAudioExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  if (dot < 0) return name;
  const ext = name.slice(dot).toLowerCase();
  return extSet.has(ext) ? name.slice(0, dot) : name;
}
