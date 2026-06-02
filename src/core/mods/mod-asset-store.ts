const DB_NAME = 'signallens-mod-assets';
const DB_VERSION = 1;
const STORE_NAME = 'files';

function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error ?? new Error('Failed to open mod asset DB'));
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
    });
}

function assetKey(modId: string, relativePath: string): string {
    return `${modId}/${relativePath}`;
}

export async function storeModAsset(modId: string, relativePath: string, data: ArrayBuffer): Promise<void> {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('Failed to store mod asset'));
        tx.objectStore(STORE_NAME).put(data, assetKey(modId, relativePath));
    });
    db.close();
}

export async function getModAsset(modId: string, relativePath: string): Promise<ArrayBuffer | null> {
    const db = await openDb();
    const result = await new Promise<ArrayBuffer | null>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        tx.onerror = () => reject(tx.error ?? new Error('Failed to read mod asset'));
        const request = tx.objectStore(STORE_NAME).get(assetKey(modId, relativePath));
        request.onsuccess = () => resolve((request.result as ArrayBuffer | undefined) ?? null);
        request.onerror = () => reject(request.error ?? new Error('Failed to read mod asset'));
    });
    db.close();
    return result;
}

export async function deleteModAssets(modId: string): Promise<void> {
    const db = await openDb();
    const prefix = `${modId}/`;
    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const cursorRequest = store.openCursor();
        cursorRequest.onerror = () => reject(cursorRequest.error ?? new Error('Failed to delete mod assets'));
        cursorRequest.onsuccess = () => {
            const cursor = cursorRequest.result;
            if (!cursor) return;
            const key = String(cursor.key);
            if (key.startsWith(prefix)) {
                cursor.delete();
            }
            cursor.continue();
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('Failed to delete mod assets'));
    });
    db.close();
}

export async function hasAllModAssets(
    modId: string,
    paths: readonly string[]
): Promise<boolean> {
    for (const relativePath of paths) {
        const asset = await getModAsset(modId, relativePath);
        if (!asset) return false;
    }
    return true;
}
