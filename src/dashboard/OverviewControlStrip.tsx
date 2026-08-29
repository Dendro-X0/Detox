import { useEffect, useMemo, useState } from 'react';
import { isFullBuild } from '../build-profile';
import type { BrowsingModeId } from '../core/modes/browsing-modes';
import type { FilterAppearancePresetId } from '../core/types/filter-appearance';
import type { EnforcementActionId } from '../core/types/enforcement';
import type { PolicyPreset } from '../core/types/policy';
import { loadEnabledModIds, subscribeToEnabledModChanges } from '../core/mods/mod-enablement-store';
import { MOD_CATALOG } from '../mods/mod-manifest';
import type { SettingsTabId } from './settings-tabs';
import { useLocale } from '../i18n/LocaleContext';

export type OverviewControlStripProps = {
    readonly enabled: boolean;
    readonly activeBrowsingModeId: BrowsingModeId | null;
    readonly sensitivity: PolicyPreset;
    readonly filterStyle: EnforcementActionId;
    readonly appearancePreset: FilterAppearancePresetId;
    readonly onNavigate: (tab: SettingsTabId) => void;
};

export default function OverviewControlStrip({
    enabled,
    activeBrowsingModeId,
    sensitivity,
    filterStyle,
    appearancePreset,
    onNavigate,
}: OverviewControlStripProps) {
    const { t } = useLocale();
    const [enabledModIds, setEnabledModIds] = useState<readonly string[]>([]);

    useEffect(() => {
        void loadEnabledModIds().then(setEnabledModIds);
        return subscribeToEnabledModChanges(setEnabledModIds);
    }, []);

    const detectorCount = useMemo(
        () =>
            MOD_CATALOG.filter(
                (mod) => mod.kind === 'detector' && enabledModIds.includes(mod.id)
            ).length,
        [enabledModIds]
    );

    const modeLabel =
        activeBrowsingModeId !== null
            ? t(`browsingModes.${activeBrowsingModeId}.label`)
            : t('browsingModes.customNote');

    const chips: readonly { readonly label: string; readonly tab: SettingsTabId }[] = [
        {
            label: t('settings.tabs.assist'),
            tab: 'assist',
        },
        {
            label: `${t('settings.overview.controlStrip.mode')}: ${modeLabel}`,
            tab: 'preferences',
        },
        {
            label: `${t('settings.overview.controlStrip.sensitivity')}: ${t(`wizard.sensitivityPresets.${sensitivity}.label`)}`,
            tab: 'preferences',
        },
        {
            label: `${t('settings.overview.controlStrip.style')}: ${t(`wizard.filterStyles.${filterStyle}`)}`,
            tab: 'preferences',
        },
        {
            label: `${t('settings.overview.controlStrip.appearance')}: ${t(`settings.filtering.appearancePresets.${appearancePreset}`)}`,
            tab: 'filtering',
        },
        {
            label: t('settings.overview.controlStrip.detectors', { count: detectorCount }),
            tab: 'plugins',
        },
    ];

    return (
        <div className="card policy-card sl-control-strip sl-span-full">
            <div className="sl-control-strip-header">
                <h3>{t('settings.overview.controlStripHeading')}</h3>
                <span className={`sl-control-strip-status${enabled ? ' is-on' : ''}`}>
                    {enabled ? t('popup.focusEnabled') : t('popup.focusDisabled')}
                </span>
            </div>
            <p className="muted sl-control-strip-desc">{t('settings.overview.controlStripDescription')}</p>
            <div className="sl-control-strip-chips">
                {chips.map((chip) => (
                    <button
                        key={chip.label}
                        type="button"
                        className="sl-choice-chip"
                        onClick={() => onNavigate(chip.tab)}
                    >
                        {chip.label}
                    </button>
                ))}
            </div>
            {isFullBuild() ? (
                <p className="muted sl-control-strip-footnote">
                    {t('settings.overview.controlStripTopicNote')}
                </p>
            ) : null}
        </div>
    );
}
