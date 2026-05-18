import { parseBlob } from "music-metadata";
import type { TrackDetailRow } from "@/lib/track/track-detail-row";
import formatFileSize from "@/lib/format-file-size";

function pushRow(
  rows: TrackDetailRow[],
  label: string,
  value: string | number | null | undefined,
  mono = false,
): void {
  if (value === null || value === undefined) return;
  const text = typeof value === "number" ? String(value) : value.trim();
  if (!text) return;
  rows.push({ label, value: text, mono });
}

/**
 * Read file properties and embedded tags for the track details dialog.
 */
export default async function extractExtendedAudioMetadataFromFile(
  file: File,
): Promise<TrackDetailRow[]> {
  const rows: TrackDetailRow[] = [];

  pushRow(rows, "File name", file.name, true);
  pushRow(rows, "MIME type", file.type || "—");
  rows.push({ label: "File size", value: formatFileSize(file.size) });
  rows.push({
    label: "Last modified",
    value: new Date(file.lastModified).toLocaleString(),
  });

  try {
    const meta = await parseBlob(file, { duration: true });
    const { format, common } = meta;

    if (format.container) pushRow(rows, "Container", format.container);
    if (format.codec) pushRow(rows, "Codec", format.codec);
    if (typeof format.bitrate === "number" && format.bitrate > 0) {
      pushRow(rows, "Bitrate", `${Math.round(format.bitrate / 1000)} kbps`);
    }
    if (typeof format.sampleRate === "number" && format.sampleRate > 0) {
      pushRow(rows, "Sample rate", `${format.sampleRate} Hz`);
    }
    if (typeof format.numberOfChannels === "number") {
      pushRow(rows, "Channels", format.numberOfChannels);
    }
    if (typeof format.bitsPerSample === "number" && format.bitsPerSample > 0) {
      pushRow(rows, "Bits per sample", format.bitsPerSample);
    }

    pushRow(rows, "Tag title", common.title);
    pushRow(rows, "Tag artist", common.artist ?? common.artists?.join(", "));
    pushRow(
      rows,
      "Tag album artist",
      common.albumartist ?? common.albumartists?.join(", "),
    );
    pushRow(rows, "Tag album", common.album);
    if (typeof common.year === "number") pushRow(rows, "Tag year", common.year);
    if (common.genre?.length)
      pushRow(rows, "Tag genre", common.genre.join(", "));
    if (typeof common.track?.no === "number") {
      pushRow(rows, "Tag track #", common.track.no);
    }
    if (typeof common.disk?.no === "number") {
      pushRow(rows, "Tag disc #", common.disk.no);
    }
    pushRow(
      rows,
      "Tag composer",
      Array.isArray(common.composer)
        ? common.composer.join(", ")
        : common.composer,
    );
    pushRow(rows, "Tag comment", common.comment?.join(" · "));
  } catch {
    pushRow(rows, "Embedded tags", "Could not read metadata from this file");
  }

  return rows;
}
