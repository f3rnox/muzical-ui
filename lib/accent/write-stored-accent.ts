import type { AccentId } from "@/lib/accent/accent-constants";
import readStoredAccentSelection from "@/lib/accent/read-stored-accent-selection";
import writeStoredAccentSelection from "@/lib/accent/write-stored-accent-selection";

/**
 * Persists the accent preset id to localStorage.
 */
export default function writeStoredAccent(accentId: AccentId): void {
  const current = readStoredAccentSelection();
  writeStoredAccentSelection({ accentId, customHex: current.customHex });
}
