import type { MusicBrainzReleaseRef } from "@/lib/musicbrainz/types";
import type { MusicBrainzSearchHints } from "@/lib/musicbrainz/build-musicbrainz-lucene-queries";

/**
 * Choose the release entry that best matches search hints (album/artist).
 */
export function pickPreferredRelease(
  releases: readonly MusicBrainzReleaseRef[] | undefined,
  hints: MusicBrainzSearchHints,
): MusicBrainzReleaseRef | undefined {
  if (!releases?.length) return undefined;

  const albumHint = hints.album?.trim().toLowerCase();
  if (albumHint) {
    const exact = releases.find((r) => {
      const title = r.title?.trim().toLowerCase() ?? "";
      const rgTitle = r["release-group"]?.title?.trim().toLowerCase() ?? "";
      return title === albumHint || rgTitle === albumHint;
    });
    if (exact) return exact;

    const partial = releases.find((r) => {
      const title = r.title?.trim().toLowerCase() ?? "";
      const rgTitle = r["release-group"]?.title?.trim().toLowerCase() ?? "";
      return title.includes(albumHint) || rgTitle.includes(albumHint);
    });
    if (partial) return partial;
  }

  const official = releases.find((r) => r.status === "Official");
  return official ?? releases[0];
}
