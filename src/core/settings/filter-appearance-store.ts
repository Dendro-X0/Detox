import {
    DEFAULT_FILTER_APPEARANCE,
    normalizeFilterAppearance,
    resolveFilterAppearance,
    type FilterAppearanceSettings,
    type FilterAppearanceStorageRecord,
    type ResolvedFilterAppearance,
} from '../types/filter-appearance';

let cachedSettings: FilterAppearanceSettings = DEFAULT_FILTER_APPEARANCE;

export function getFilterAppearanceSettings(): FilterAppearanceSettings {
    return cachedSettings;
}

export function getResolvedFilterAppearance(): ResolvedFilterAppearance {
    return resolveFilterAppearance(cachedSettings);
}

export async function loadFilterAppearanceSettings(): Promise<FilterAppearanceSettings> {
    const result = await chrome.storage.local.get('filterAppearance');
    const record = result as FilterAppearanceStorageRecord;
    cachedSettings = normalizeFilterAppearance(record.filterAppearance);
    return cachedSettings;
}

export async function saveFilterAppearanceSettings(
    settings: FilterAppearanceSettings
): Promise<void> {
    cachedSettings = normalizeFilterAppearance(settings);
    await chrome.storage.local.set({ filterAppearance: cachedSettings });
}

export function subscribeToFilterAppearanceChanges(
    onChange: (settings: FilterAppearanceSettings) => void
): void {
    chrome.storage.onChanged.addListener((changes) => {
        if (changes.filterAppearance) {
            const next = changes.filterAppearance.newValue as FilterAppearanceSettings | undefined;
            cachedSettings = normalizeFilterAppearance(next);
            onChange(cachedSettings);
        }
    });
}

export function installFilterAppearanceLoader(): void {
    void loadFilterAppearanceSettings();
    subscribeToFilterAppearanceChanges(() => {
        // Reads via getResolvedFilterAppearance() stay fresh.
    });
}
