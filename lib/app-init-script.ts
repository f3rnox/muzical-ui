import {
  ACCENT_IDS,
  ACCENT_STORAGE_KEY,
  CUSTOM_ACCENT_PALETTE_STORAGE_KEY,
  DEFAULT_ACCENT_ID,
} from "@/lib/accent/accent-constants";
import { ACCENT_SHADES } from "@/lib/accent/accent-shades";
import { THEME_STORAGE_KEY } from "@/lib/theme-constants";

/**
 * Runs before paint so theme and accent match localStorage on the first frame.
 */
export default function getAppInitScript(): string {
  const themeKey = JSON.stringify(THEME_STORAGE_KEY);
  const accentKey = JSON.stringify(ACCENT_STORAGE_KEY);
  const paletteKey = JSON.stringify(CUSTOM_ACCENT_PALETTE_STORAGE_KEY);
  const accentIds = JSON.stringify(ACCENT_IDS);
  const accentShades = JSON.stringify(ACCENT_SHADES);
  const defaultAccent = JSON.stringify(DEFAULT_ACCENT_ID);
  return `(function(){try{var t=localStorage.getItem(${themeKey});document.documentElement.classList.toggle('dark',t==='dark');var a=localStorage.getItem(${accentKey});var ids=${accentIds};var shades=${accentShades};var r=document.documentElement;if(a==='custom'){r.setAttribute('data-accent','custom');var pal=localStorage.getItem(${paletteKey});if(pal){try{var p=JSON.parse(pal);for(var i=0;i<shades.length;i++){var k=shades[i];if(typeof p[k]==='string')r.style.setProperty('--accent-'+k,p[k]);}}catch(e){}}}else{r.setAttribute('data-accent',ids.indexOf(a)>=0?a:${defaultAccent});}}catch(e){}})();`;
}
