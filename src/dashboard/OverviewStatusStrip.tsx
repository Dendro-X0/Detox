/// <reference types="chrome" />
import { useEffect, useState } from 'react';
import type { BrowsingModeId } from '../core/modes/browsing-modes';
import { loadUserRules } from '../core/rules/user-rules-store';
import { getRollupSnapshot } from '../core/storage/scan-stats-store';
import { useLocale } from '../i18n/LocaleContext';
import type { SettingsTabId } from './settings-tabs';

export type OverviewStatusStripProps = {
    readonly enabled: boolean;
    readonly activeBrowsingModeId: BrowsingModeId | null;
    readonly onNavigate?: (tab: SettingsTabId) => void;
};

export default function OverviewStatusStrip({
    enabled,
    activeBrowsingModeId,
    onNavigate,
}: OverviewStatusStripProps) {
    const { t } = useLocale();
    const [whitelistCount, setWhitelistCount] = useState(0);
    const [filteredToday, setFilteredToday] = useState(0);

    useEffect(() => {
        void loadUserRules().then((rules) => {
            setWhitelistCount(rules.allowDomains.length);
        });
        void getRollupSnapshot().then((rollup) => {
            setFilteredToday(rollup.today.filtered);
        });

        const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string): void => {
            if (area !== 'local') return;
            if (changes.userRules) {
                const next = changes.userRules.newValue as { readonly allowDomains?: readonly string[] } | undefined;
                if (next?.allowDomains) {
                    setWhitelistCount(next.allowDomains.length);
                } else {
                    void loadUserRules().then((rules) => {
                        setWhitelistCount(rules.allowDomains.length);
                    });
                }
            }
            if (changes.scanStatsRollup) {
                void getRollupSnapshot().then((rollup) => {
                    setFilteredToday(rollup.today.filtered);
                });
            }
        };
        chrome.storage.onChanged.addListener(onChanged);
        return () => chrome.storage.onChanged.removeListener(onChanged);
    }, []);

    const modeLabel = activeBrowsingModeId !== null
        ? t(`browsingModes.${activeBrowsingModeId}.label`)
        : t('settings.overview.statusStrip.modeCustom');

    return (
        <div className="sl-overview-status-strip sl-span-full" role="status" aria-live="polite">
            <span className={`sl-status-chip sl-status-chip--focus${enabled ? ' is-on' : ''}`}>
                {enabled ? t('settings.overview.statusStrip.focusOn') : t('settings.overview.statusStrip.focusOff')}
            </span>
            <span className="sl-status-chip">
                {t('settings.overview.statusStrip.mode')}: {modeLabel}
            </span>
            <button
                type="button"
                className="sl-status-chip sl-status-chip--link"
                onClick={() => onNavigate?.('rules')}
            >
                {t('settings.overview.statusStrip.whitelist', { count: whitelistCount })}
            </button>
            <button
                type="button"
                className="sl-status-chip sl-status-chip--link"
                onClick={() => onNavigate?.('filtering')}
            >
                {t('settings.overview.statusStrip.filteredToday', { count: filteredToday })}
            </button>
        </div>
    );
}
