import type { SettingsTabId } from '../dashboard/settings-tabs';

export function getSettingsTabLabels(
    t: (key: string) => string
): readonly { readonly id: SettingsTabId; readonly label: string }[] {
    return [
        { id: 'overview', label: t('settings.tabs.overview') },
        { id: 'preferences', label: t('settings.tabs.preferences') },
        { id: 'filtering', label: t('settings.tabs.filtering') },
        { id: 'plugins', label: t('settings.tabs.plugins') },
        { id: 'privacy', label: t('settings.tabs.privacy') },
    ];
}
