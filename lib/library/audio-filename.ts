import { LIBRARY_AUDIO_EXTENSIONS } from "@/lib/library/constants";

const defaultExtSet = new Set(LIBRARY_AUDIO_EXTENSIONS);

/**
 * Returns true when the file name matches an enabled audio extension.
 */
export function isAudioFilename(
  name: string,
  enabledExtensions?: ReadonlySet<string>,
): boolean {
  const dot = name.lastIndexOf(".");
  if (dot < 0) return false;
  const ext = name.slice(dot).toLowerCase();
  const set = enabledExtensions ?? defaultExtSet;
  return set.has(ext);
}

/**
 * Strips a known audio extension for display as a title.
 */
export function stripAudioExtension(
  name: string,
  enabledExtensions?: ReadonlySet<string>,
): string {
  const dot = name.lastIndexOf(".");
  if (dot < 0) return name;
  const ext = name.slice(dot).toLowerCase();
  const set = enabledExtensions ?? defaultExtSet;
  return set.has(ext) ? name.slice(0, dot) : name;
}
