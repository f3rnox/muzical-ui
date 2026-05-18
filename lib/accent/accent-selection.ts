import type { AccentId } from "@/lib/accent/accent-constants";

/** Persisted accent choice: preset id or custom base hex. */
export type AccentSelection = {
  accentId: AccentId;
  customHex: string;
};
