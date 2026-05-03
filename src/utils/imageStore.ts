/**
 * IndexedDB-backed store for AI-generated recipe images.
 *
 * Storing images as Blobs in IndexedDB (instead of base64 data URLs in
 * localStorage) avoids two problems on iPadOS Safari: localStorage's hard
 * ~5 MB per-origin cap, and the ~33% size penalty of base64 encoding.
 * IndexedDB quotas are orders of magnitude larger.
 *
 * Images are intentionally device-local: they are not part of the Gist sync
 * payload (cheap to regenerate, expensive to ship) and not part of share URLs.
 */

const DB_NAME = 'ai-recipe-planner';
const DB_VERSION = 1;
const IMAGE_STORE = 'recipe_images';

let dbPromise: Promise<IDBDatabase> | null = null;

const openDb = (): Promise<IDBDatabase> => {
    if (dbPromise) return dbPromise;
    if (typeof indexedDB === 'undefined') {
        return Promise.reject(new Error('IndexedDB is not available'));
    }
    dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(IMAGE_STORE)) {
                db.createObjectStore(IMAGE_STORE);
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => {
            dbPromise = null;
            reject(req.error ?? new Error('Failed to open IndexedDB'));
        };
        req.onblocked = () => reject(new Error('IndexedDB upgrade blocked'));
    });
    return dbPromise;
};

const promisifyRequest = <T>(req: IDBRequest<T>): Promise<T> =>
    new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });

export const getRecipeImage = async (recipeId: string): Promise<Blob | null> => {
    const db = await openDb();
    const store = db.transaction(IMAGE_STORE, 'readonly').objectStore(IMAGE_STORE);
    const value = await promisifyRequest(store.get(recipeId));
    return (value as Blob | undefined) ?? null;
};

export const setRecipeImage = async (recipeId: string, blob: Blob): Promise<void> => {
    const db = await openDb();
    const store = db.transaction(IMAGE_STORE, 'readwrite').objectStore(IMAGE_STORE);
    await promisifyRequest(store.put(blob, recipeId));
};

export const deleteRecipeImage = async (recipeId: string): Promise<void> => {
    const db = await openDb();
    const store = db.transaction(IMAGE_STORE, 'readwrite').objectStore(IMAGE_STORE);
    await promisifyRequest(store.delete(recipeId));
};

export const getAllRecipeImageIds = async (): Promise<string[]> => {
    const db = await openDb();
    const store = db.transaction(IMAGE_STORE, 'readonly').objectStore(IMAGE_STORE);
    const keys = await promisifyRequest(store.getAllKeys());
    return keys.map(String);
};

/**
 * Removes images whose recipe id is not in `keepIds`. Used to clean up after
 * recipe deletions and meal-plan replacements without bloating IndexedDB.
 *
 * All deletions share a single transaction — issuing them as N separate
 * transactions adds noticeable overhead when many recipes are pruned at once
 * (e.g. after generating a fresh meal plan).
 */
export const pruneRecipeImages = async (keepIds: ReadonlySet<string>): Promise<void> => {
    const all = await getAllRecipeImageIds();
    const toDelete = all.filter((id) => !keepIds.has(id));
    if (toDelete.length === 0) return;
    const db = await openDb();
    const store = db.transaction(IMAGE_STORE, 'readwrite').objectStore(IMAGE_STORE);
    await Promise.all(toDelete.map((id) => promisifyRequest(store.delete(id))));
};
