import { parseBlob } from "music-metadata";

export type ExtractedCoverBytes = {
  mime: string;
  /** Image bytes (no object URL) for efficient reuse */
  data: Uint8Array<ArrayBuffer>;
};

/**
 * Extracts embedded cover art from an audio `File`.
 * Returns raw image bytes; callers can create object URLs and should revoke them.
 */
export async function extractCoverBytesFromAudioFile(
  file: File,
): Promise<ExtractedCoverBytes | null> {
  try {
    const meta = await parseBlob(file, { duration: false });
    const pictures = meta.common.picture;
    if (!pictures?.length) return null;

    const front = pictures.find((p) => {
      const t = p.type?.toLowerCase() ?? "";
      return t.includes("front") || t.includes("cover");
    });
    const chosen =
      front ??
      pictures.reduce((a, b) => (b.data.length > a.data.length ? b : a));
    const mime =
      chosen.format?.trim() ||
      (chosen.name?.toLowerCase().endsWith(".png")
        ? "image/png"
        : "image/jpeg");

    return {
      mime,
      data: Uint8Array.from(chosen.data),
    };
  } catch {
    return null;
  }
}
