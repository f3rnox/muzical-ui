/** Result of writing embedded tags to a local audio file. */
export type WriteAudioTagsResult = { ok: true } | { ok: false; reason: string };

/** Result of writing embedded tags for multiple tracks. */
export type WriteAudioTagsBulkResult = {
  ok: boolean;
  writtenCount: number;
  failedCount: number;
  reason: string | null;
};
