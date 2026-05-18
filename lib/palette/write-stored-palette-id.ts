import {
  PALETTE_STORAGE_KEY,
  type PaletteId,
} from "@/lib/palette/palette-constants";

/**
 * Persists the active color palette id.
 */
export default function writeStoredPaletteId(paletteId: PaletteId): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PALETTE_STORAGE_KEY, paletteId);
  } catch {
    /* ignore quota / private mode */
  }
}
