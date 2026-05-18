import type { FavoritesExportDocument } from "@/types/favorites-export";

type FavoritesExportInput = {
  songIds: readonly string[];
  artistNames: readonly string[];
  albumKeys: readonly string[];
};

/**
 * Builds a versioned JSON document for favorites backup export.
 */
export default function buildFavoritesExportDocument(
  input: FavoritesExportInput,
): FavoritesExportDocument {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    songIds: [...input.songIds],
    artistNames: [...input.artistNames],
    albumKeys: [...input.albumKeys],
  };
}
