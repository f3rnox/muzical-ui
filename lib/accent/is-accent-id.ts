import { ACCENT_IDS, type AccentId } from "@/lib/accent/accent-constants";

/**
 * True when a string is a supported accent preset id.
 */
export default function isAccentId(value: string): value is AccentId {
  return (ACCENT_IDS as readonly string[]).includes(value);
}
