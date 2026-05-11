import { parseBlob } from "music-metadata";

/** Normalized tags used to build `Track` rows for the library. */
export type ExtractedAudioTags = {
  title: string;
  artist: string;
  album: string;
  durationSec: number;
};

/**
 * Reads ID3/Vorbis/etc. tags and duration from an audio `File` (browser-safe `parseBlob`).
 */
export async function extractTagsFromAudioFile(
  file: File,
): Promise<ExtractedAudioTags | null> {
  try {
    const meta = await parseBlob(file, { duration: true });
    const title = meta.common.title?.trim() ?? "";
    const artist =
      meta.common.artist?.trim() ||
      meta.common.artists?.[0]?.trim() ||
      meta.common.albumartist?.trim() ||
      meta.common.albumartists?.[0]?.trim() ||
      "";
    const album = meta.common.album?.trim() ?? "";
    const d = meta.format.duration;
    const durationSec =
      typeof d === "number" && Number.isFinite(d) ? Math.round(d) : 0;
    return { title, artist, album, durationSec };
  } catch {
    return null;
  }
}
