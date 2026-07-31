/// <reference types="chrome" />
import { useCallback, useEffect, useMemo, useState } from 'react';
import { isFullBuild, getBuildProfile } from '../build-profile';
import {
    loadEnabledModIds,
    setModEnabled,
    subscribeToEnabledModChanges,
    isRequiredMod,
} from '../core/mods/mod-enablement-store';
import {
    DEFAULT_ROUTING_SETTINGS,
    type InferenceRoutingSettings,
    type PrimaryProviderMode,
} from '../core/types/routing';
import { MOD_CATALOG, isModUnlocked, type ModDescriptor } from '../mods/mod-manifest';
import { getLocalizedModFields } from '../i18n/mod-catalog';
import { useLocale } from '../i18n/LocaleContext';

export default function FilterModelsPanel() {
    const { t } = useLocale();
    const [enabledModIds, setEnabledModIds] = useState<readonly string[]>([]);
    const [routing, setRouting] = useState<InferenceRoutingSettings>(DEFAULT_ROUTING_SETTINGS);

    const refresh = useCallback(() => {
        void loadEnabledModIds().then(setEnabledModIds);
        void chrome.storage.local.get('inferenceRouting').then((result) => {
            const record = result as { inferenceRouting?: InferenceRoutingSettings };
            if (record.inferenceRouting) {
                setRouting({ ...DEFAULT_ROUTING_SETTINGS, ...record.inferenceRouting });
            }
        });
    }, []);

    useEffect(() => {
        refresh();
        subscribeToEnabledModChanges(setEnabledModIds);
        const onStorage = (
            changes: Record<string, chrome.storage.StorageChange>,
            area: string
        ): void => {
            if (area !== 'local' || !changes.inferenceRouting) return;
            const next = changes.inferenceRouting.newValue as InferenceRoutingSettings | undefined;
            if (next) setRouting({ ...DEFAULT_ROUTING_SETTINGS, ...next });
        };
        chrome.storage.onChanged.addListener(onStorage);
        return () => chrome.storage.onChanged.removeListener(onStorage);
    }, [refresh]);

    const detectorMods = useMemo(
        () =>
            MOD_CATALOG.filter(
                (mod) => mod.kind === 'detector' && isModUnlocked(mod.id, getBuildProfile())
            ),
        []
    );

    const setPrimaryMode = (mode: PrimaryProviderMode): void => {
        const next = { ...routing, primaryMode: mode };
        void chrome.storage.local.set({
            inferenceRouting: next,
            preferredDetectorId: mode === 'heuristic' ? 'heuristic-keywords' : 'local-pack',
        });
        setRouting(next);
    };

    const onToggleDetector = (mod: ModDescriptor, next: boolean): void => {
        void setModEnabled(mod.id, next);
    };

    return (
        <div className="card policy-card sl-filter-models-panel sl-span-full">
            <h3>{t('plugins.filterModels.heading')}</h3>
            <p className="muted" style={{ marginTop: 0, fontSize: '0.85rem' }}>
                {t('plugins.filterModels.description')}
            </p>

            <h4 className="sl-subsection-title">{t('plugins.filterModels.classifierHeading')}</h4>
            <p className="muted sl-section-desc">{t('plugins.filterModels.classifierDescription')}</p>
            <div className="sl-choice-list">
                <button
                    type="button"
                    className={`sl-choice-item${routing.primaryMode === 'heuristic' ? ' is-active' : ''}`}
                    onClick={() => setPrimaryMode('heuristic')}
                >
                    <span className="sl-choice-item-body">
                        <strong>{t('settings.filtering.heuristicOffline')}</strong>
                        <span className="muted sl-choice-item-hint">
                            {t('plugins.filterModels.heuristicHint')}
                        </span>
                    </span>
                </button>
                {isFullBuild() ? (
                    <button
                        type="button"
                        className={`sl-choice-item${routing.primaryMode === 'local-pack' ? ' is-active' : ''}`}
                        onClick={() => setPrimaryMode('local-pack')}
                    >
                        <span className="sl-choice-item-body">
                            <strong>{t('settings.filtering.localPackOnnx')}</strong>
                            <span className="muted sl-choice-item-hint">
                                {t('plugins.filterModels.localPackHint')}
                            </span>
                        </span>
                    </button>
                ) : (
                    <p className="sl-wizard-callout">{t('plugins.filterModels.coreBuildOnnxNote')}</p>
                )}
            </div>

            <h4 className="sl-subsection-title" style={{ marginTop: '1.25rem' }}>
                {t('plugins.filterModels.detectorsHeading')}
            </h4>
            <div className="sl-filter-models-list">
                {detectorMods.map((mod) => {
                    const localized = getLocalizedModFields(mod, t);
                    const enabled = enabledModIds.includes(mod.id);
                    const required = isRequiredMod(mod.id);
                    return (
                        <label
                            key={mod.id}
                            className={`sl-filter-model-row${enabled ? ' is-enabled' : ''}`}
                        >
                            <input
                                type="checkbox"
                                checked={enabled}
                                disabled={required}
                                onChange={(e) => onToggleDetector(mod, e.target.checked)}
                            />
                            <span className="sl-filter-model-body">
                                <strong>{localized.name}</strong>
                                <span className="muted">{localized.description}</span>
                                {required ? (
                                    <span className="sl-status-badge sl-status-badge--required">
                                        {t('plugins.badges.alwaysOn')}
                                    </span>
                                ) : null}
                            </span>
                        </label>
                    );
                })}
            </div>
        </div>
    );
}
