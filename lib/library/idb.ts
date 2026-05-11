import {
  LIBRARY_CATALOG_STORE_NAME,
  LIBRARY_DB_NAME,
  LIBRARY_DB_VERSION,
  LIBRARY_STORE_NAME,
} from "@/lib/library/constants";
import type { Track } from "@/types/track";

export type StoredLibraryRoot = {
  id: string;
  name: string;
  addedAt: number;
  handle: FileSystemDirectoryHandle;
};

const CATALOG_KEY = "catalog" as const;
const FAVORITES_KEY = "favorites" as const;

export type StoredLibraryCatalog = {
  key: typeof CATALOG_KEY;
  /** Sorted root ids — must match configured folders for this snapshot to apply */
  rootIds: string[];
  tracks: Track[];
  savedAt: number;
};

export type StoredFavorites = {
  key: typeof FAVORITES_KEY;
  songIds: string[];
  artistNames: string[];
  albumKeys: string[];
};

/**
 * Opens the library IndexedDB, creating the object store on upgrade.
 */
export function openLibraryDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(LIBRARY_DB_NAME, LIBRARY_DB_VERSION);
    req.onerror = (): void => {
      reject(req.error ?? new Error("IndexedDB open failed"));
    };
    req.onsuccess = (): void => {
      resolve(req.result);
    };
    req.onupgradeneeded = (): void => {
      const db = req.result;
      if (!db.objectStoreNames.contains(LIBRARY_STORE_NAME)) {
        db.createObjectStore(LIBRARY_STORE_NAME, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(LIBRARY_CATALOG_STORE_NAME)) {
        db.createObjectStore(LIBRARY_CATALOG_STORE_NAME, { keyPath: "key" });
      }
    };
  });
}

/**
 * Persists a library root (directory handle is stored via structured clone).
 */
export function idbPutRoot(
  db: IDBDatabase,
  root: StoredLibraryRoot,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(LIBRARY_STORE_NAME, "readwrite");
    const store = tx.objectStore(LIBRARY_STORE_NAME);
    const putReq = store.put(root);
    putReq.onerror = (): void => {
      reject(putReq.error ?? new Error("IndexedDB put failed"));
    };
    tx.oncomplete = (): void => {
      resolve();
    };
    tx.onerror = (): void => {
      reject(tx.error ?? new Error("IndexedDB transaction failed"));
    };
  });
}

/**
 * Deletes a library root by id.
 */
export function idbDeleteRoot(db: IDBDatabase, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(LIBRARY_STORE_NAME, "readwrite");
    const store = tx.objectStore(LIBRARY_STORE_NAME);
    const delReq = store.delete(id);
    delReq.onerror = (): void => {
      reject(delReq.error ?? new Error("IndexedDB delete failed"));
    };
    tx.oncomplete = (): void => {
      resolve();
    };
    tx.onerror = (): void => {
      reject(tx.error ?? new Error("IndexedDB transaction failed"));
    };
  });
}

/**
 * Loads all configured library roots from IndexedDB.
 */
export function idbGetAllRoots(db: IDBDatabase): Promise<StoredLibraryRoot[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(LIBRARY_STORE_NAME, "readonly");
    const store = tx.objectStore(LIBRARY_STORE_NAME);
    const getReq = store.getAll();
    getReq.onerror = (): void => {
      reject(getReq.error ?? new Error("IndexedDB getAll failed"));
    };
    getReq.onsuccess = (): void => {
      resolve(getReq.result as StoredLibraryRoot[]);
    };
  });
}

function sortedRootIds(ids: readonly string[]): string[] {
  return [...ids].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
}

/**
 * Saves the last library scan snapshot (track metadata + paths) for faster reload.
 */
export function idbPutCatalog(
  db: IDBDatabase,
  rootIds: readonly string[],
  tracks: readonly Track[],
): Promise<void> {
  if (!db.objectStoreNames.contains(LIBRARY_CATALOG_STORE_NAME)) {
    return Promise.reject(
      new Error(`Missing object store ${LIBRARY_CATALOG_STORE_NAME}`),
    );
  }
  const row: StoredLibraryCatalog = {
    key: CATALOG_KEY,
    rootIds: sortedRootIds(rootIds),
    tracks: [...tracks],
    savedAt: Date.now(),
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(LIBRARY_CATALOG_STORE_NAME, "readwrite");
    const store = tx.objectStore(LIBRARY_CATALOG_STORE_NAME);
    const putReq = store.put(row);
    putReq.onerror = (): void => {
      reject(putReq.error ?? new Error("IndexedDB catalog put failed"));
    };
    tx.oncomplete = (): void => {
      resolve();
    };
    tx.onerror = (): void => {
      reject(tx.error ?? new Error("IndexedDB catalog transaction failed"));
    };
  });
}

/**
 * Loads the persisted catalog snapshot, if any.
 */
export function idbGetCatalog(
  db: IDBDatabase,
): Promise<StoredLibraryCatalog | null> {
  if (!db.objectStoreNames.contains(LIBRARY_CATALOG_STORE_NAME)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(LIBRARY_CATALOG_STORE_NAME, "readonly");
    const store = tx.objectStore(LIBRARY_CATALOG_STORE_NAME);
    const getReq = store.get(CATALOG_KEY);
    getReq.onerror = (): void => {
      reject(getReq.error ?? new Error("IndexedDB catalog get failed"));
    };
    getReq.onsuccess = (): void => {
      const raw = getReq.result as StoredLibraryCatalog | undefined;
      if (
        !raw ||
        raw.key !== CATALOG_KEY ||
        !Array.isArray(raw.rootIds) ||
        !Array.isArray(raw.tracks)
      ) {
        resolve(null);
        return;
      }
      resolve(raw);
    };
  });
}

const defaultFavorites = (): StoredFavorites => ({
  key: FAVORITES_KEY,
  songIds: [],
  artistNames: [],
  albumKeys: [],
});

/**
 * Loads saved favorites (songs by track id, artists by display name, albums by composite key).
 */
export function idbGetFavorites(db: IDBDatabase): Promise<StoredFavorites> {
  if (!db.objectStoreNames.contains(LIBRARY_CATALOG_STORE_NAME)) {
    return Promise.resolve(defaultFavorites());
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(LIBRARY_CATALOG_STORE_NAME, "readonly");
    const store = tx.objectStore(LIBRARY_CATALOG_STORE_NAME);
    const getReq = store.get(FAVORITES_KEY);
    getReq.onerror = (): void => {
      reject(getReq.error ?? new Error("IndexedDB favorites get failed"));
    };
    getReq.onsuccess = (): void => {
      const raw = getReq.result as StoredFavorites | undefined;
      if (
        !raw ||
        raw.key !== FAVORITES_KEY ||
        !Array.isArray(raw.songIds) ||
        !Array.isArray(raw.artistNames) ||
        !Array.isArray(raw.albumKeys)
      ) {
        resolve(defaultFavorites());
        return;
      }
      resolve({
        key: FAVORITES_KEY,
        songIds: [...raw.songIds],
        artistNames: [...raw.artistNames],
        albumKeys: [...raw.albumKeys],
      });
    };
  });
}

/**
 * Persists favorites in the same object store as the catalog (separate key).
 */
export function idbPutFavorites(
  db: IDBDatabase,
  data: {
    songIds: readonly string[];
    artistNames: readonly string[];
    albumKeys: readonly string[];
  },
): Promise<void> {
  if (!db.objectStoreNames.contains(LIBRARY_CATALOG_STORE_NAME)) {
    return Promise.reject(
      new Error(`Missing object store ${LIBRARY_CATALOG_STORE_NAME}`),
    );
  }
  const payload: StoredFavorites = {
    key: FAVORITES_KEY,
    songIds: [...data.songIds],
    artistNames: [...data.artistNames],
    albumKeys: [...data.albumKeys],
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(LIBRARY_CATALOG_STORE_NAME, "readwrite");
    const store = tx.objectStore(LIBRARY_CATALOG_STORE_NAME);
    const putReq = store.put(payload);
    putReq.onerror = (): void => {
      reject(putReq.error ?? new Error("IndexedDB favorites put failed"));
    };
    tx.oncomplete = (): void => {
      resolve();
    };
    tx.onerror = (): void => {
      reject(tx.error ?? new Error("IndexedDB favorites transaction failed"));
    };
  });
}
