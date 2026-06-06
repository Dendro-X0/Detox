/**
 * Session-scoped storage with `local` fallback (Firefox MV2 has no session storage).
 */
type StorageArea = {
    get(keys: string | string[] | null): Promise<Record<string, unknown>>;
    set(items: Record<string, unknown>): Promise<void>;
    remove(keys: string | string[]): Promise<void>;
};

export type SessionAreaName = 'session' | 'local';

export function getSessionAreaName(): SessionAreaName {
    if (typeof chrome !== 'undefined' && chrome.storage?.session) {
        return 'session';
    }
    return 'local';
}

function getSessionArea(): StorageArea {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
        throw new Error('Extension storage unavailable');
    }
    if (chrome.storage.session) {
        return chrome.storage.session as StorageArea;
    }
    return chrome.storage.local as StorageArea;
}

export async function sessionGet<T>(key: string): Promise<T | undefined> {
    const result = await getSessionArea().get(key);
    return result[key] as T | undefined;
}

export async function sessionSet(key: string, value: unknown): Promise<void> {
    await getSessionArea().set({ [key]: value });
}

export async function sessionRemove(key: string): Promise<void> {
    await getSessionArea().remove(key);
}

export function subscribeSessionChanges(
    listener: (changes: Record<string, chrome.storage.StorageChange>) => void
): () => void {
    const areaName = getSessionAreaName();
    const handler = (
        changes: Record<string, chrome.storage.StorageChange>,
        changedArea: string
    ): void => {
        if (changedArea !== areaName) return;
        listener(changes);
    };
    chrome.storage.onChanged.addListener(handler);
    return () => chrome.storage.onChanged.removeListener(handler);
}
