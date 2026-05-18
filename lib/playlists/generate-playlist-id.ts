/**
 * Generate a random playlist id usable as a localStorage record key.
 */
export default function generatePlaylistId(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `pl_${Date.now().toString(36)}_${rand}`;
}
