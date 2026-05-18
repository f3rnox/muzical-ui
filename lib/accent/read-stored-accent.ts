import type { AccentId } from "@/lib/accent/accent-constants";
import readStoredAccentSelection from "@/lib/accent/read-stored-accent-selection";

/**
 * Loads the accent preset id from localStorage.
 */
export default function readStoredAccent(): AccentId {
  return readStoredAccentSelection().accentId;
}
