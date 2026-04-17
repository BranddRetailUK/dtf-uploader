import type { LayoutBackgroundMode } from "@/lib/domain";

const DRAFTS_DB_NAME = "dtf-uploader-browser-drafts";
const DRAFTS_DB_VERSION = 1;
const UPLOAD_DRAFT_STORE = "uploadDrafts";
const LAYOUT_DRAFT_STORE = "layoutDrafts";

export type UploadDraftRecord = {
  id: string;
  selectedId: string | null;
  files: Array<{
    clientId: string;
    name: string;
    type: string;
    size: number;
    quantity: number;
    file: File;
  }>;
};

export type LayoutDraftRecord = {
  id: string;
  selectedArtworkId: string | null;
  backgroundMode: LayoutBackgroundMode;
  assets: Array<{
    assetId: string;
    name: string;
    bytes: number;
    widthPx: number;
    heightPx: number;
    file: File;
  }>;
  artworks: Array<{
    id: string;
    groupId: string;
    xMm: number;
    yMm: number;
    widthMm: number;
    heightMm: number;
    zIndex: number;
  }>;
};

let openDatabasePromise: Promise<IDBDatabase | null> | null = null;

function canUseIndexedDb() {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function getDraftRecordId(userId: string) {
  return `user:${userId}`;
}

function openDraftDatabase() {
  if (!canUseIndexedDb()) {
    return Promise.resolve(null);
  }

  if (!openDatabasePromise) {
    openDatabasePromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = window.indexedDB.open(DRAFTS_DB_NAME, DRAFTS_DB_VERSION);

      request.onupgradeneeded = () => {
        const database = request.result;

        if (!database.objectStoreNames.contains(UPLOAD_DRAFT_STORE)) {
          database.createObjectStore(UPLOAD_DRAFT_STORE, {
            keyPath: "id",
          });
        }

        if (!database.objectStoreNames.contains(LAYOUT_DRAFT_STORE)) {
          database.createObjectStore(LAYOUT_DRAFT_STORE, {
            keyPath: "id",
          });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("IndexedDB unavailable."));
    }).catch(() => null);
  }

  return openDatabasePromise;
}

async function readRecord<T>(storeName: string, id: string) {
  const database = await openDraftDatabase();

  if (!database) {
    return null;
  }

  return new Promise<T | null>((resolve, reject) => {
    const transaction = database.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.get(id);

    request.onsuccess = () => resolve((request.result as T | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB read failed."));
  }).catch(() => null);
}

async function writeRecord<T extends { id: string }>(storeName: string, value: T) {
  const database = await openDraftDatabase();

  if (!database) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite");

    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("IndexedDB write failed."));

    transaction.objectStore(storeName).put(value);
  }).catch(() => undefined);
}

async function deleteRecord(storeName: string, id: string) {
  const database = await openDraftDatabase();

  if (!database) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite");

    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("IndexedDB delete failed."));

    transaction.objectStore(storeName).delete(id);
  }).catch(() => undefined);
}

export function loadUploadDraft(userId: string) {
  return readRecord<UploadDraftRecord>(UPLOAD_DRAFT_STORE, getDraftRecordId(userId));
}

export function saveUploadDraft(userId: string, draft: Omit<UploadDraftRecord, "id">) {
  return writeRecord<UploadDraftRecord>(UPLOAD_DRAFT_STORE, {
    id: getDraftRecordId(userId),
    ...draft,
  });
}

export function clearUploadDraft(userId: string) {
  return deleteRecord(UPLOAD_DRAFT_STORE, getDraftRecordId(userId));
}

export function loadLayoutDraft(userId: string) {
  return readRecord<LayoutDraftRecord>(LAYOUT_DRAFT_STORE, getDraftRecordId(userId));
}

export function saveLayoutDraft(userId: string, draft: Omit<LayoutDraftRecord, "id">) {
  return writeRecord<LayoutDraftRecord>(LAYOUT_DRAFT_STORE, {
    id: getDraftRecordId(userId),
    ...draft,
  });
}

export function clearLayoutDraft(userId: string) {
  return deleteRecord(LAYOUT_DRAFT_STORE, getDraftRecordId(userId));
}
