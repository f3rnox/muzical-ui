import {
  DEFAULT_PALETTE_ID,
  LEGACY_ACCENT_STORAGE_KEY,
  LEGACY_ACCENT_TO_PALETTE,
  PALETTE_STORAGE_KEY,
  type PaletteId,
} from "@/lib/palette/palette-constants";
import isPaletteId from "@/lib/palette/is-palette-id";

/**
 * Loads the persisted color palette id, migrating legacy accent keys when needed.
 */
export default function readStoredPaletteId(): PaletteId {
  if (typeof window === "undefined") return DEFAULT_PALETTE_ID;
  try {
    const raw =
      window.localStorage.getItem(PALETTE_STORAGE_KEY) ??
      window.localStorage.getItem(LEGACY_ACCENT_STORAGE_KEY);
    if (!raw) return DEFAULT_PALETTE_ID;
    if (isPaletteId(raw)) return raw;
    const migrated = LEGACY_ACCENT_TO_PALETTE[raw];
    return migrated ?? DEFAULT_PALETTE_ID;
  } catch {
    return DEFAULT_PALETTE_ID;
  }
}
