export type SettingsTabId = 'overview' | 'filtering' | 'rules' | 'plugins' | 'privacy';

export const SETTINGS_TABS: readonly { readonly id: SettingsTabId; readonly label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'filtering', label: 'Filtering' },
    { id: 'rules', label: 'Rules' },
    { id: 'plugins', label: 'Plugins' },
    { id: 'privacy', label: 'Privacy' },
];

export function isSettingsTabId(value: string): value is SettingsTabId {
    return SETTINGS_TABS.some((tab) => tab.id === value);
}

export function parseSettingsTabFromHash(): SettingsTabId {
    const hash = window.location.hash.replace(/^#/, '');
    return isSettingsTabId(hash) ? hash : 'overview';
}
