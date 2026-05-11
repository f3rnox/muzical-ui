import { THEME_STORAGE_KEY } from "@/lib/theme-constants";

/**
 * Runs before paint so the first frame matches stored theme (default light).
 */
export function getThemeInitScript(): string {
  const k = JSON.stringify(THEME_STORAGE_KEY);
  return `(function(){try{var s=localStorage.getItem(${k});document.documentElement.classList.toggle('dark',s==='dark');}catch(e){}})();`;
}
