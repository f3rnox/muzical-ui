/**
 * Maps File System Access / Security errors to a short, actionable UI string.
 */
export function formatFsAccessErrorMessage(e: unknown): string {
  if (e instanceof DOMException) {
    if (e.name === "AbortError") {
      return "";
    }
    if (
      e.name === "SecurityError" ||
      e.name === "NotAllowedError" ||
      e.message.includes("not allowed by the user agent") ||
      e.message.includes("The request is not allowed")
    ) {
      return "Folder access is blocked in this context. Open the app in Chrome or Edge in a normal window (not an embedded preview), and use https:// or http://localhost.";
    }
  }
  if (e instanceof Error) {
    const m = e.message;
    if (
      m.includes("not allowed by the user agent") ||
      m.includes("The request is not allowed")
    ) {
      return "Folder access is blocked in this context. Open the app in Chrome or Edge in a normal window (not an embedded preview), and use https:// or http://localhost.";
    }
    return m;
  }
  return "Could not access the folder.";
}
