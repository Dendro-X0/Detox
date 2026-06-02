import type { InstalledModRecord, InstalledModsStorageRecord } from './mod-package-types';

export type { InstalledModRecord } from './mod-package-types';

let cachedInstalled: readonly InstalledModRecord[] = [];

export function getInstalledMods(): readonly InstalledModRecord[] {
    return cachedInstalled;
}

export function isModInstalled(modId: string): boolean {
    return cachedInstalled.some((record) => record.modId === modId);
}

export function getInstalledMod(modId: string): InstalledModRecord | undefined {
    return cachedInstalled.find((record) => record.modId === modId);
}

export async function loadInstalledMods(): Promise<readonly InstalledModRecord[]> {
    const result = await chrome.storage.local.get('installedMods');
    const record = result as InstalledModsStorageRecord;
    cachedInstalled = Array.isArray(record.installedMods) ? record.installedMods : [];
    return cachedInstalled;
}

async function persistInstalledMods(records: readonly InstalledModRecord[]): Promise<void> {
    cachedInstalled = records;
    await chrome.storage.local.set({ installedMods: records });
}

export async function upsertInstalledMod(record: InstalledModRecord): Promise<void> {
    const next = cachedInstalled.filter((entry) => entry.modId !== record.modId);
    await persistInstalledMods([...next, record]);
}

export async function removeInstalledMod(modId: string): Promise<void> {
    await persistInstalledMods(cachedInstalled.filter((entry) => entry.modId !== modId));
}

export function subscribeToInstalledModChanges(onChange: (records: readonly InstalledModRecord[]) => void): void {
    chrome.storage.onChanged.addListener((changes) => {
        if (changes.installedMods) {
            void loadInstalledMods().then((records) => onChange(records));
        }
    });
}
