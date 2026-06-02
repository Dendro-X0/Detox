/**
 * Session storage with local fallback (Firefox MV2 and older builds).
 */
type SessionArea = {
    get(keys: string | string[] | null): Promise<Record<string, unknown>>;
    set(items: Record<string, unknown>): Promise<void>;
    remove(keys: string | string[]): Promise<void>;
};

function getSessionArea(): SessionArea {
    if (chrome.storage.session) {
        return chrome.storage.session as SessionArea;
    }
    return chrome.storage.local as SessionArea;
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
