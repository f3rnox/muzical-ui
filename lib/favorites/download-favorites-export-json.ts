import buildFavoritesExportDocument from "@/lib/favorites/build-favorites-export-document";
import type { FavoritesExportDocument } from "@/types/favorites-export";

type FavoritesExportInput = {
  songIds: readonly string[];
  artistNames: readonly string[];
  albumKeys: readonly string[];
};

function favoritesExportFilename(): string {
  const day = new Date().toISOString().slice(0, 10);
  return `muzical-favorites-${day}.json`;
}

/**
 * Downloads favorites as a JSON file in the browser.
 */
export default function downloadFavoritesExportJson(
  input: FavoritesExportInput,
): void {
  if (typeof window === "undefined") return;
  const doc: FavoritesExportDocument = buildFavoritesExportDocument(input);
  const json = JSON.stringify(doc, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = favoritesExportFilename();
  anchor.click();
  URL.revokeObjectURL(url);
}
