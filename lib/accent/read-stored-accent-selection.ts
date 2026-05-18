import {
  ACCENT_STORAGE_KEY,
  CUSTOM_ACCENT_HEX_STORAGE_KEY,
  DEFAULT_ACCENT_ID,
  DEFAULT_CUSTOM_ACCENT_HEX,
  type AccentId,
} from "@/lib/accent/accent-constants";
import type { AccentSelection } from "@/lib/accent/accent-selection";
import isAccentId from "@/lib/accent/is-accent-id";
import parseHexColor from "@/lib/accent/parse-hex-color";

/**
 * Loads accent preset id and custom hex from localStorage.
 */
export default function readStoredAccentSelection(): AccentSelection {
  if (typeof window === "undefined") {
    return {
      accentId: DEFAULT_ACCENT_ID,
      customHex: DEFAULT_CUSTOM_ACCENT_HEX,
    };
  }

  let customHex = DEFAULT_CUSTOM_ACCENT_HEX;
  try {
    const rawHex = window.localStorage.getItem(CUSTOM_ACCENT_HEX_STORAGE_KEY);
    if (typeof rawHex === "string") {
      const parsed = parseHexColor(rawHex);
      if (parsed) customHex = parsed;
    }
  } catch {
    /* ignore */
  }

  try {
    const raw = window.localStorage.getItem(ACCENT_STORAGE_KEY);
    const accentId: AccentId =
      typeof raw === "string" && isAccentId(raw) ? raw : DEFAULT_ACCENT_ID;
    return { accentId, customHex };
  } catch {
    return { accentId: DEFAULT_ACCENT_ID, customHex };
  }
}
