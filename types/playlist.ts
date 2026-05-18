/**
 * User-defined playlist of library track ids.
 */
export type Playlist = {
  id: string;
  name: string;
  /** Ordered track ids that reference {@link Track.id} */
  trackIds: string[];
  /** Epoch ms */
  createdAt: number;
  /** Epoch ms */
  updatedAt: number;
};
