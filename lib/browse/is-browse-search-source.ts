import type { BrowseSearchSource } from "@/types/browse-search";

/**
 * Type guard for stored browse search source values.
 */
export default function isBrowseSearchSource(
  value: unknown,
): value is BrowseSearchSource {
  return value === "library" || value === "musicbrainz" || value === "youtube";
}
