/**
 * Local library track shape. Align with your API contract when the backend is ready.
 */
export type Track = {
  id: string;
  title: string;
  artist: string;
  album: string;
  /** Seconds; from metadata or API */
  durationSec: number;
  /** Stream URL once API serves files or signed URLs */
  audioUrl?: string | null;
};
