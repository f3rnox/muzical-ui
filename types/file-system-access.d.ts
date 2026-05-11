/**
 * Augment DOM types for File System Access API (directory picker + async iteration).
 */
export {};

declare global {
  interface Window {
    showDirectoryPicker(options?: {
      mode?: "read" | "readwrite";
    }): Promise<FileSystemDirectoryHandle>;
  }

  interface FileSystemDirectoryHandle {
    entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
    queryPermission?(options?: {
      mode?: "read" | "readwrite";
    }): Promise<PermissionState>;
    requestPermission?(options?: {
      mode?: "read" | "readwrite";
    }): Promise<PermissionState>;
  }
}
