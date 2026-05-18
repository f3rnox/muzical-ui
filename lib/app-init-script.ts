import {
  DEFAULT_PALETTE_ID,
  LEGACY_ACCENT_STORAGE_KEY,
  LEGACY_ACCENT_TO_PALETTE,
  PALETTE_IDS,
  PALETTE_STORAGE_KEY,
} from "@/lib/palette/palette-constants";
import { THEME_STORAGE_KEY } from "@/lib/theme-constants";

/**
 * Runs before paint so light/dark scheme and color palette match localStorage.
 */
export default function getAppInitScript(): string {
  const themeKey = JSON.stringify(THEME_STORAGE_KEY);
  const paletteKey = JSON.stringify(PALETTE_STORAGE_KEY);
  const legacyAccentKey = JSON.stringify(LEGACY_ACCENT_STORAGE_KEY);
  const paletteIds = JSON.stringify(PALETTE_IDS);
  const legacyMap = JSON.stringify(LEGACY_ACCENT_TO_PALETTE);
  const defaultPalette = JSON.stringify(DEFAULT_PALETTE_ID);
  return `(function(){try{var t=localStorage.getItem(${themeKey});document.documentElement.classList.toggle('dark',t==='dark');var p=localStorage.getItem(${paletteKey})||localStorage.getItem(${legacyAccentKey});var map=${legacyMap};var ids=${paletteIds};if(p&&map[p])p=map[p];if(!p||ids.indexOf(p)<0)p=${defaultPalette};document.documentElement.setAttribute('data-palette',p);}catch(e){}})();`;
}
