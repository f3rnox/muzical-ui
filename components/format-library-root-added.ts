/**
 * Formats when a library root folder was added for display in settings.
 */
export default function formatLibraryRootAdded(ts: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(ts));
  } catch {
    return new Date(ts).toLocaleString();
  }
}
