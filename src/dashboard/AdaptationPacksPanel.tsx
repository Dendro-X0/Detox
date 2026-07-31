/// <reference types="chrome" />
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getBuildProfile } from '../build-profile';
import { ADAPTATION_CONTENT_TYPES, type AdaptationContentType } from '../core/adaptation/adaptation-pack-types';
import { getMergedAdaptationRules } from '../core/adaptation/adaptation-pack-registry';
import {
    filterAdaptationPacks,
    getPackLanguageGroup,
    groupAdaptationPacksByLanguage,
    type AdaptationLanguageFilter,
    type AdaptationLanguageGroup,
} from '../mods/adaptation-packs/adaptation-pack-filters';
import {
    ADAPTATION_PACK_CATALOG,
    listAdaptationPackDescriptors,
    type AdaptationPackDescriptor,
} from '../mods/adaptation-packs/catalog';
import {
    isModUnlocked,
    isRequiredMod,
    loadEnabledModIds,
    setModEnabled,
    subscribeToEnabledModChanges,
} from '../core/mods/mod-enablement-store';
import { loadInstalledMods, subscribeToInstalledModChanges } from '../core/mods/installed-mod-store';
import { getLocalizedModFields } from '../i18n/mod-catalog';
import { useLocale } from '../i18n/LocaleContext';

const LANGUAGE_FILTERS: readonly AdaptationLanguageFilter[] = ['all', 'en', 'de', 'universal'];
const LANGUAGE_GROUP_ORDER: readonly AdaptationLanguageGroup[] = ['en', 'de', 'universal', 'other'];

type PackRowProps = {
    readonly pack: AdaptationPackDescriptor;
    readonly enabled: boolean;
    readonly unlocked: boolean;
    readonly installed: boolean;
    readonly onToggle: (packId: string, next: boolean) => void;
};

function PackRow({ pack, enabled, unlocked, installed, onToggle, t }: PackRowProps & { readonly t: (key: string) => string }) {
    const localized = getLocalizedModFields(pack, t);
    const isBundled = ADAPTATION_PACK_CATALOG.some((entry) => entry.id === pack.id);
    return (
        <div className={`sl-mod-card sl-adaptation-pack-card${enabled ? ' is-enabled' : ''}`}>
            <div className="sl-mod-card-header">
                <span className="pack-name">{localized.name}</span>
                <div className="sl-mod-badges">
                    {pack.contentTypes.map((type) => (
                        <span key={type} className="sl-status-badge sl-adaptation-type-badge">
                            {t(`plugins.adaptationPacks.contentTypes.${type}`)}
                        </span>
                    ))}
                    {installed && !isBundled ? (
                        <span className="sl-status-badge sl-status-badge--installed">
                            {t('plugins.badges.installed')}
                        </span>
                    ) : null}
                </div>
                <label className="switch sl-mod-toggle">
                    <input
                        type="checkbox"
                        checked={enabled}
                        disabled={!unlocked}
                        onChange={(e) => onToggle(pack.id, e.target.checked)}
                    />
                    <span className="slider" />
                </label>
            </div>
            <p className="sl-mod-description">{localized.description}</p>
            <div className="sl-mod-meta">
                <span>{t(`plugins.adaptationPacks.languageGroups.${getPackLanguageGroup(pack)}`)}</span>
                <span className="sl-mod-meta-sep">·</span>
                <span>{pack.contexts.join(', ')}</span>
                <span className="sl-mod-meta-sep">·</span>
                <span>{localized.sizeLabel}</span>
            </div>
            <p className="sl-mod-footnote sl-adaptation-privacy-note">{localized.permissionsSummary}</p>
        </div>
    );
}

type FilterChipProps = {
    readonly active: boolean;
    readonly label: string;
    readonly onClick: () => void;
};

function FilterChip({ active, label, onClick }: FilterChipProps) {
    return (
        <button
            type="button"
            className={`sl-adaptation-filter-chip${active ? ' is-active' : ''}`}
            onClick={onClick}
        >
            {label}
        </button>
    );
}

export default function AdaptationPacksPanel() {
    const { t } = useLocale();
    const profile = getBuildProfile();
    const [enabledIds, setEnabledIds] = useState<readonly string[]>([]);
    const [installedIds, setInstalledIds] = useState<readonly string[]>([]);
    const [languageFilter, setLanguageFilter] = useState<AdaptationLanguageFilter>('all');
    const [contentTypeFilter, setContentTypeFilter] = useState<AdaptationContentType | 'all'>('all');

    const refresh = useCallback(() => {
        void loadEnabledModIds().then(setEnabledIds);
        void loadInstalledMods().then((records) => setInstalledIds(records.map((r) => r.modId)));
    }, []);

    useEffect(() => {
        refresh();
        subscribeToEnabledModChanges(setEnabledIds);
        subscribeToInstalledModChanges((records) => setInstalledIds(records.map((r) => r.modId)));
    }, [refresh]);

    const packs = useMemo(() => listAdaptationPackDescriptors(), [enabledIds, installedIds]);

    const filteredPacks = useMemo(
        () => filterAdaptationPacks(packs, languageFilter, contentTypeFilter),
        [packs, languageFilter, contentTypeFilter]
    );

    const groupedPacks = useMemo(
        () => groupAdaptationPacksByLanguage(filteredPacks),
        [filteredPacks]
    );

    const activeSummary = useMemo(() => getMergedAdaptationRules(), [enabledIds]);

    const onToggle = (packId: string, next: boolean): void => {
        if (!isModUnlocked(packId, profile) || isRequiredMod(packId)) return;
        void setModEnabled(packId, next).then(() => refresh());
    };

    const showGrouped = languageFilter === 'all';

    return (
        <div className="card policy-card sl-adaptation-packs-panel sl-span-full">
            <h3>{t('plugins.adaptationPacks.heading')}</h3>
            <p className="muted sl-section-desc">{t('plugins.adaptationPacks.description')}</p>
            <p className="sl-wizard-callout sl-adaptation-privacy-banner">
                {t('plugins.adaptationPacks.privacyBanner')}
            </p>

            {activeSummary.activePackIds.length > 0 ? (
                <p className="sl-form-hint">
                    {t('plugins.adaptationPacks.activeSummary', {
                        count: activeSummary.activePackIds.length,
                        keywords: activeSummary.supplementalKeywords.length,
                    })}
                </p>
            ) : (
                <p className="muted sl-form-hint">{t('plugins.adaptationPacks.noneActive')}</p>
            )}

            <div className="sl-adaptation-filters">
                <div className="sl-adaptation-filter-row">
                    <span className="sl-adaptation-filter-label">{t('plugins.adaptationPacks.filterLanguage')}</span>
                    <div className="sl-adaptation-filter-chips">
                        {LANGUAGE_FILTERS.map((filter) => (
                            <FilterChip
                                key={filter}
                                active={languageFilter === filter}
                                label={t(`plugins.adaptationPacks.languageFilters.${filter}`)}
                                onClick={() => setLanguageFilter(filter)}
                            />
                        ))}
                    </div>
                </div>
                <div className="sl-adaptation-filter-row">
                    <span className="sl-adaptation-filter-label">{t('plugins.adaptationPacks.filterContentType')}</span>
                    <div className="sl-adaptation-filter-chips">
                        <FilterChip
                            active={contentTypeFilter === 'all'}
                            label={t('plugins.adaptationPacks.contentTypeFilters.all')}
                            onClick={() => setContentTypeFilter('all')}
                        />
                        {ADAPTATION_CONTENT_TYPES.map((type) => (
                            <FilterChip
                                key={type}
                                active={contentTypeFilter === type}
                                label={t(`plugins.adaptationPacks.contentTypes.${type}`)}
                                onClick={() => setContentTypeFilter(type)}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {filteredPacks.length === 0 ? (
                <p className="muted sl-adaptation-empty-filter">{t('plugins.adaptationPacks.noMatchingPacks')}</p>
            ) : showGrouped ? (
                LANGUAGE_GROUP_ORDER.map((group) => {
                    const groupPacks = groupedPacks.get(group) ?? [];
                    if (groupPacks.length === 0) return null;
                    return (
                        <section key={group} className="sl-adaptation-pack-group">
                            <h4 className="sl-adaptation-pack-group-title">
                                {t(`plugins.adaptationPacks.languageGroups.${group}`)}
                            </h4>
                            <div className="sl-mod-list">
                                {groupPacks.map((pack) => (
                                    <PackRow
                                        key={pack.id}
                                        pack={pack}
                                        enabled={enabledIds.includes(pack.id)}
                                        unlocked={isModUnlocked(pack.id, profile)}
                                        installed={installedIds.includes(pack.id)}
                                        onToggle={onToggle}
                                        t={t}
                                    />
                                ))}
                            </div>
                        </section>
                    );
                })
            ) : (
                <div className="sl-mod-list">
                    {filteredPacks.map((pack) => (
                        <PackRow
                            key={pack.id}
                            pack={pack}
                            enabled={enabledIds.includes(pack.id)}
                            unlocked={isModUnlocked(pack.id, profile)}
                            installed={installedIds.includes(pack.id)}
                            onToggle={onToggle}
                            t={t}
                        />
                    ))}
                </div>
            )}

            <p className="muted sl-adaptation-install-hint">{t('plugins.adaptationPacks.installHint')}</p>
        </div>
    );
}
