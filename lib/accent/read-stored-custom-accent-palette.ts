import { CUSTOM_ACCENT_PALETTE_STORAGE_KEY } from "@/lib/accent/accent-constants";
import type { AccentPalette } from "@/lib/accent/accent-shades";
import { ACCENT_SHADES } from "@/lib/accent/accent-shades";
import parseHexColor from "@/lib/accent/parse-hex-color";

/**
 * Read cached custom palette JSON for fast first-paint theming.
 */
export default function readStoredCustomAccentPalette(): AccentPalette | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CUSTOM_ACCENT_PALETTE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AccentPalette>;
    if (!parsed || typeof parsed !== "object") return null;
    for (const shade of ACCENT_SHADES) {
      const value = parsed[shade];
      if (typeof value !== "string" || !parseHexColor(value)) return null;
    }
    return parsed as AccentPalette;
  } catch {
    return null;
  }
}
