/**
 * Parse #rgb, #rrggbb, or rrggbb into normalized #rrggbb (lowercase).
 */
export default function parseHexColor(input: string): string | null {
  const trimmed = input.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(trimmed)) {
    const r = trimmed[0] + trimmed[0];
    const g = trimmed[1] + trimmed[1];
    const b = trimmed[2] + trimmed[2];
    return `#${r}${g}${b}`.toLowerCase();
  }
  if (/^[0-9a-fA-F]{6}$/.test(trimmed)) {
    return `#${trimmed}`.toLowerCase();
  }
  return null;
}
