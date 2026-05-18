/**
 * Browser file-system library reference (File System Access API).
 */
export type LibraryTrackRef = {
  rootId: string;
  relativePath: string;
  /** `File.lastModified` when metadata was last parsed */
  fileLastModified?: number;
  /** `File.size` when metadata was last parsed */
  fileSize?: number;
};

/**
 * Local library track shape. Align with your API contract when the backend is ready.
 */
export type Track = {
  id: string;
  title: string;
  artist: string;
  album: string;
  /** Seconds; from metadata, decode, or API */
  durationSec: number;
  /** Stream URL once API serves files or signed URLs */
  audioUrl?: string | null;
  /** YouTube search query for browser playback */
  youtubeQuery?: string;
  /** Resolved YouTube video id (YouTube Data API v3) */
  youtubeVideoId?: string;
  /** Origin source for the track */
  source?: "library" | "musicbrainz" | "youtube";
  /** Set when the row comes from a configured local scan directory */
  library?: LibraryTrackRef;
};
