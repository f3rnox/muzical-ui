import applyAccentSelectionToDocument from "@/lib/accent/apply-accent-selection-to-document";
import type { AccentId } from "@/lib/accent/accent-constants";
import readStoredAccentSelection from "@/lib/accent/read-stored-accent-selection";

/**
 * Sets accent on the document root from a preset id (uses stored custom hex when needed).
 */
export default function applyAccentToDocument(accentId: AccentId): void {
  const stored = readStoredAccentSelection();
  applyAccentSelectionToDocument({ accentId, customHex: stored.customHex });
}
