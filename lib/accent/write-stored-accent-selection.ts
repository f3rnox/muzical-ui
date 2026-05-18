import {
  ACCENT_STORAGE_KEY,
  CUSTOM_ACCENT_HEX_STORAGE_KEY,
  CUSTOM_ACCENT_PALETTE_STORAGE_KEY,
} from "@/lib/accent/accent-constants";
import type { AccentSelection } from "@/lib/accent/accent-selection";
import generateAccentScaleFromHex from "@/lib/accent/generate-accent-scale-from-hex";
import parseHexColor from "@/lib/accent/parse-hex-color";

/**
 * Persist accent preset id, custom hex, and precomputed custom palette.
 */
export default function writeStoredAccentSelection(
  selection: AccentSelection,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ACCENT_STORAGE_KEY, selection.accentId);
    const hex = parseHexColor(selection.customHex);
    if (hex) {
      window.localStorage.setItem(CUSTOM_ACCENT_HEX_STORAGE_KEY, hex);
      if (selection.accentId === "custom") {
        const palette = generateAccentScaleFromHex(hex);
        if (palette) {
          window.localStorage.setItem(
            CUSTOM_ACCENT_PALETTE_STORAGE_KEY,
            JSON.stringify(palette),
          );
        }
      }
    }
  } catch {
    /* ignore quota / private mode */
  }
}
