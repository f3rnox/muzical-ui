/**
 * Ensure read-write permission on a library folder handle (prompts when allowed).
 */
export default async function ensureDirectoryWriteAccess(
  handle: FileSystemDirectoryHandle,
  mayRequestPrompt: boolean,
): Promise<boolean> {
  const opts = { mode: "readwrite" as const };
  try {
    const q = await handle.queryPermission?.(opts);
    if (q === "granted") return true;
    if (!mayRequestPrompt) return false;
    const r = await handle.requestPermission?.(opts);
    return r === "granted";
  } catch {
    return false;
  }
}
