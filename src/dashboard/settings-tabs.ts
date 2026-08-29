export type SettingsTabId = 'overview' | 'assist' | 'filtering' | 'preferences' | 'plugins' | 'privacy';

/** @deprecated Use `preferences`. Kept for hash / deep-link compatibility. */
export type LegacySettingsTabId = 'rules';

const TAB_IDS: readonly SettingsTabId[] = [
    'overview',
    'assist',
    'preferences',
    'filtering',
    'plugins',
    'privacy',
];

const LEGACY_TAB_ALIASES: Readonly<Record<string, SettingsTabId>> = {
    rules: 'preferences',
};

export const SETTINGS_TABS: readonly { readonly id: SettingsTabId; readonly label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'assist', label: 'Assist' },
    { id: 'preferences', label: 'Preferences' },
    { id: 'filtering', label: 'Filtering' },
    { id: 'plugins', label: 'Plugins' },
    { id: 'privacy', label: 'Privacy' },
];

export function isSettingsTabId(value: string): value is SettingsTabId {
    return TAB_IDS.includes(value as SettingsTabId);
}

export function resolveSettingsTabId(value: string): SettingsTabId | null {
    if (isSettingsTabId(value)) return value;
    return LEGACY_TAB_ALIASES[value] ?? null;
}

export function parseSettingsTabFromHash(): SettingsTabId {
    const hash = window.location.hash.replace(/^#/, '');
    return resolveSettingsTabId(hash) ?? 'overview';
}
