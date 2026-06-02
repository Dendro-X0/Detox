import type { BuildProfile } from '../../build-profile';
import { getBuildProfile } from '../../build-profile';
import {
    MOD_CATALOG,
    REQUIRED_MOD_IDS,
    getModsForProfile,
    isModUnlocked,
    setEnabledModIdCache,
    type ModDescriptor,
} from '../../mods/mod-manifest';

export { isModUnlocked } from '../../mods/mod-manifest';

export type ModEnablementStorageRecord = {
    readonly enabledModIds?: readonly string[];
};

let cachedEnabledModIds: readonly string[] | null = null;

function isAllowedModId(modId: string, profile: BuildProfile): boolean {
    return isModUnlocked(modId, profile);
}

function normalizeEnabledIds(ids: readonly string[], profile: BuildProfile): readonly string[] {
    const next = new Set<string>();
    for (const required of REQUIRED_MOD_IDS) {
        if (isAllowedModId(required, profile)) next.add(required);
    }
    for (const id of ids) {
        if (isAllowedModId(id, profile)) next.add(id);
    }
    return [...next];
}

export function getDefaultEnabledModIds(profile: BuildProfile = getBuildProfile()): readonly string[] {
    return getModsForProfile(profile).map((mod) => mod.id);
}

export function getEnabledModIds(): readonly string[] {
    return cachedEnabledModIds ?? getDefaultEnabledModIds();
}

export function isModEnabled(modId: string): boolean {
    return getEnabledModIds().includes(modId);
}

export function isRequiredMod(modId: string): boolean {
    return (REQUIRED_MOD_IDS as readonly string[]).includes(modId);
}

export async function loadEnabledModIds(): Promise<readonly string[]> {
    const profile = getBuildProfile();
    const result = await chrome.storage.local.get('enabledModIds');
    const record = result as ModEnablementStorageRecord;
    const stored = record.enabledModIds;
    if (Array.isArray(stored) && stored.length > 0) {
        cachedEnabledModIds = normalizeEnabledIds(
            stored.filter((id): id is string => typeof id === 'string'),
            profile
        );
    } else {
        cachedEnabledModIds = getDefaultEnabledModIds(profile);
    }
    setEnabledModIdCache(cachedEnabledModIds);
    return cachedEnabledModIds;
}

export async function saveEnabledModIds(ids: readonly string[]): Promise<void> {
    const profile = getBuildProfile();
    const normalized = normalizeEnabledIds(ids, profile);
    cachedEnabledModIds = normalized;
    setEnabledModIdCache(normalized);
    await chrome.storage.local.set({ enabledModIds: normalized });
}

export async function setModEnabled(modId: string, enabled: boolean): Promise<void> {
    if (!isModUnlocked(modId, getBuildProfile())) return;
    if (isRequiredMod(modId) && !enabled) return;

    const current = [...getEnabledModIds()];
    const has = current.includes(modId);
    if (enabled && !has) {
        await saveEnabledModIds([...current, modId]);
        return;
    }
    if (!enabled && has) {
        await saveEnabledModIds(current.filter((id) => id !== modId));
    }
}

export function subscribeToEnabledModChanges(onChange: (ids: readonly string[]) => void): void {
    chrome.storage.onChanged.addListener((changes) => {
        if (changes.enabledModIds) {
            void loadEnabledModIds().then((ids) => onChange(ids));
        }
    });
}

export function modDescriptorForId(modId: string): ModDescriptor | undefined {
    return MOD_CATALOG.find((mod) => mod.id === modId);
}
