const DB_NAME = "CharacterAppDB";
const DB_VERSION = 3; // 递增数据库版本以触发onupgradeneeded

export const CHARACTERS_RECORD_FILE = "characters_record";
export const CHARACTER_DIALOGUES_FILE = "character_dialogues";
export const CHARACTER_IMAGES_FILE = "character_images";
export const WORLD_BOOK_FILE = "world_book";
export const REGEX_SCRIPTS_FILE = "regex_scripts";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CHARACTERS_RECORD_FILE)) {
        db.createObjectStore(CHARACTERS_RECORD_FILE);
      }
      if (!db.objectStoreNames.contains(CHARACTER_DIALOGUES_FILE)) {
        db.createObjectStore(CHARACTER_DIALOGUES_FILE);
      }
      if (!db.objectStoreNames.contains(CHARACTER_IMAGES_FILE)) {
        db.createObjectStore(CHARACTER_IMAGES_FILE);
      }
      if (!db.objectStoreNames.contains(WORLD_BOOK_FILE)) {
        db.createObjectStore(WORLD_BOOK_FILE);
      }
      if (!db.objectStoreNames.contains(REGEX_SCRIPTS_FILE)) {
        db.createObjectStore(REGEX_SCRIPTS_FILE);
      }
    };
  });
}

export async function readData(storeName: string): Promise<any[]> {
  await initializeDataFiles();
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const request = store.get("data");

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function writeData(storeName: string, data: any[]): Promise<void> {
  await initializeDataFiles();
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const request = store.put(data, "data");

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function initializeDataFiles(): Promise<void> {
  const db = await openDB();

  const storeNames = [
    CHARACTERS_RECORD_FILE, 
    CHARACTER_DIALOGUES_FILE, 
    CHARACTER_IMAGES_FILE,
    WORLD_BOOK_FILE,
  ];

  await Promise.all(storeNames.map(storeName => {
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const getRequest = store.get("data");

      getRequest.onsuccess = () => {
        if (getRequest.result === undefined) {
          const putRequest = store.put([], "data");
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }));
}

export async function setBlob(key: string, blob: Blob): Promise<void> {
  await initializeDataFiles();
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHARACTER_IMAGES_FILE, "readwrite");
    const store = tx.objectStore(CHARACTER_IMAGES_FILE);
    const request = store.put(blob, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getBlob(key: string): Promise<Blob | null> {
  await initializeDataFiles();
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHARACTER_IMAGES_FILE, "readonly");
    const store = tx.objectStore(CHARACTER_IMAGES_FILE);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteBlob(key: string): Promise<void> {
  await initializeDataFiles();
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHARACTER_IMAGES_FILE, "readwrite");
    const store = tx.objectStore(CHARACTER_IMAGES_FILE);
    const request = store.delete(key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

