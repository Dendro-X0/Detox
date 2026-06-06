import { useCallback, useEffect, useState } from 'react';
import { parseSettingsTabFromHash, type SettingsTabId } from './settings-tabs';

export function useSettingsTab(): readonly [SettingsTabId, (tab: SettingsTabId) => void] {
    const [tab, setTabState] = useState<SettingsTabId>(parseSettingsTabFromHash);

    useEffect(() => {
        const syncFromHash = (): void => {
            setTabState(parseSettingsTabFromHash());
        };
        window.addEventListener('hashchange', syncFromHash);
        return () => window.removeEventListener('hashchange', syncFromHash);
    }, []);

    const setTab = useCallback((next: SettingsTabId) => {
        if (window.location.hash.replace(/^#/, '') !== next) {
            window.location.hash = next;
        }
        setTabState(next);
    }, []);

    return [tab, setTab] as const;
}
