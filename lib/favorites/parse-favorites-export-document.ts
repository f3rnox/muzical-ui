import type { FavoritesExportDocument } from "@/types/favorites-export";

function normalizeStringIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const ids = value.filter(
    (x): x is string => typeof x === "string" && x.trim() !== "",
  );
  return [...new Set(ids)].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
}

/**
 * Validates JSON from an export file (or legacy favorites payload).
 */
export default function parseFavoritesExportDocument(
  raw: unknown,
): FavoritesExportDocument | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const songIds = normalizeStringIds(o.songIds);
  const artistNames = normalizeStringIds(o.artistNames);
  const albumKeys = normalizeStringIds(o.albumKeys);
  if (
    songIds.length === 0 &&
    artistNames.length === 0 &&
    albumKeys.length === 0
  ) {
    return null;
  }
  const exportedAt =
    typeof o.exportedAt === "string" && o.exportedAt.trim() !== ""
      ? o.exportedAt
      : new Date().toISOString();
  return {
    version: 1,
    exportedAt,
    songIds,
    artistNames,
    albumKeys,
  };
}
