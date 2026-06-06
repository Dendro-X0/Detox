/// <reference types="chrome" />
import type { ModelPack } from '../types/model-pack';
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { isFullBuild } from '../build-profile';
import type { BrowsingModeId } from '../core/modes/browsing-modes';
import type { EnforcementActionId, EnforcementActionSettings } from '../core/types/enforcement';
import type { PolicyPreset } from '../core/types/policy';
import type { InferenceRoutingSettings, PrimaryProviderMode } from '../core/types/routing';
import { loadEnabledModIds, subscribeToEnabledModChanges } from '../core/mods/mod-enablement-store';
import { MOD_CATALOG } from '../mods/mod-manifest';
import { getLocalizedModFields } from '../i18n/mod-catalog';
import { useLocale } from '../i18n/LocaleContext';
import { detectorLabel } from './runtime-labels';
import FilterStylePreview from './FilterStylePreview';
import { getVisibleFilterStyles } from './filter-styles';

type PolicySettings = {
    readonly preset: PolicyPreset;
    readonly threshold: number;
    readonly perSite: Record<string, number>;
};

type LanguagePackState = {
    readonly availablePacks: readonly ModelPack[];
    readonly detectedLanguage: string;
    readonly detectedConfidence: number;
    readonly selectedPackId: string | null;
    readonly autoSelected: boolean;
};

type RuntimeStatus = {
    readonly activeDetectorId: string | null;
    readonly remoteApiReady?: boolean;
};

export type FilteringSettingsPanelProps = {
    readonly policy: PolicySettings;
    readonly setPreset: (preset: PolicyPreset) => void;
    readonly routing: InferenceRoutingSettings;
    readonly saveRouting: (next: InferenceRoutingSettings) => void;
    readonly setPrimaryMode: (mode: PrimaryProviderMode) => void;
    readonly enforcementAction: EnforcementActionSettings;
    readonly setActionId: (actionId: EnforcementActionId) => void;
    readonly activeBrowsingModeId: BrowsingModeId | null;
    readonly runtimeStatus: RuntimeStatus;
    readonly packState: LanguagePackState;
    readonly showPackSelector: boolean;
    readonly setShowPackSelector: (open: boolean) => void;
    readonly setPackState: Dispatch<SetStateAction<LanguagePackState>>;
    readonly onNavigateRules?: () => void;
};

const SENSITIVITY_PRESETS: readonly PolicyPreset[] = ['conservative', 'balanced', 'strict'];

export default function FilteringSettingsPanel({
    policy,
    setPreset,
    routing,
    saveRouting,
    setPrimaryMode,
    enforcementAction,
    setActionId,
    activeBrowsingModeId,
    runtimeStatus,
    packState,
    showPackSelector,
    setShowPackSelector,
    setPackState,
    onNavigateRules,
}: FilteringSettingsPanelProps) {
    const { t } = useLocale();
    const [enabledModIds, setEnabledModIds] = useState<readonly string[]>([]);

    useEffect(() => {
        void loadEnabledModIds().then(setEnabledModIds);
        subscribeToEnabledModChanges(setEnabledModIds);
    }, []);

    const visibleStyles = useMemo(() => getVisibleFilterStyles(t), [t]);

    const enabledDetectors = useMemo(
        () =>
            MOD_CATALOG.filter(
                (mod) => mod.kind === 'detector' && enabledModIds.includes(mod.id)
            ),
        [enabledModIds]
    );

    const inferenceModeLabel =
        routing.primaryMode === 'local-pack'
            ? t('settings.filtering.localPackOnnx')
            : t('settings.filtering.heuristicOffline');

    const filterStyleLabel = t(`wizard.filterStyles.${enforcementAction.activeActionId}`);
    const sensitivityLabel = t(`wizard.sensitivityPresets.${policy.preset}.label`);

    return (
        <div className="sl-filtering-panel">
            {activeBrowsingModeId !== null ? (
                <div className="sl-wizard-callout sl-span-full">
                    {t('settings.filtering.browsingModeNotice', {
                        mode: t(`browsingModes.${activeBrowsingModeId}.label`),
                    })}
                </div>
            ) : null}

            <div className="card policy-card sl-filtering-summary sl-span-full">
                <h3>{t('settings.filtering.summaryHeading')}</h3>
                <dl className="sl-wizard-review-grid">
                    <div className="sl-wizard-review-row">
                        <dt>{t('settings.filtering.summaryInference')}</dt>
                        <dd>{inferenceModeLabel}</dd>
                    </div>
                    <div className="sl-wizard-review-row">
                        <dt>{t('settings.filtering.summarySensitivity')}</dt>
                        <dd>{sensitivityLabel}</dd>
                    </div>
                    <div className="sl-wizard-review-row">
                        <dt>{t('settings.filtering.summaryStyle')}</dt>
                        <dd>{filterStyleLabel}</dd>
                    </div>
                    <div className="sl-wizard-review-row">
                        <dt>{t('settings.filtering.summaryClassifier')}</dt>
                        <dd>{detectorLabel(runtimeStatus.activeDetectorId, t)}</dd>
                    </div>
                </dl>
            </div>

            <section className="sl-filtering-section sl-span-full">
                <h3 className="sl-filtering-section-title">{t('settings.filtering.classifyHeading')}</h3>
                <p className="muted sl-filtering-section-desc">{t('settings.filtering.classifyDescription')}</p>
            </section>

            <div className="card policy-card">
                <h3>{t('settings.filtering.inferenceHeading')}</h3>
                <p className="muted" style={{ marginTop: 0, fontSize: '0.85rem' }}>
                    {isFullBuild() ? t('settings.filtering.inferenceFull') : t('settings.filtering.inferenceCore')}
                </p>
                {isFullBuild() ? (
                    <>
                        <div className="sl-choice-list">
                            <button
                                type="button"
                                className={`sl-choice-item${routing.primaryMode === 'heuristic' ? ' is-active' : ''}`}
                                onClick={() => setPrimaryMode('heuristic')}
                            >
                                <span className="sl-choice-item-body">
                                    <strong>{t('settings.filtering.heuristicOffline')}</strong>
                                    <span className="muted sl-choice-item-hint">
                                        {t('settings.filtering.heuristicDescription')}
                                    </span>
                                </span>
                            </button>
                            <button
                                type="button"
                                className={`sl-choice-item${routing.primaryMode === 'local-pack' ? ' is-active' : ''}`}
                                onClick={() => setPrimaryMode('local-pack')}
                            >
                                <span className="sl-choice-item-body">
                                    <strong>{t('settings.filtering.localPackOnnx')}</strong>
                                    <span className="muted sl-choice-item-hint">
                                        {t('settings.filtering.localPackDescription')}
                                    </span>
                                </span>
                            </button>
                        </div>
                        <details className="sl-install-details">
                            <summary>{t('settings.filtering.remoteApiHeading')}</summary>
                            <label className="sl-check-row" style={{ marginTop: '0.65rem' }}>
                                <input
                                    type="checkbox"
                                    checked={routing.escalationEnabled}
                                    onChange={(e) => saveRouting({ ...routing, escalationEnabled: e.target.checked })}
                                />
                                <span>{t('settings.filtering.escalationLabel')}</span>
                            </label>
                            {routing.escalationEnabled ? (
                                <div className="sl-form-stack" style={{ marginTop: '0.65rem' }}>
                                    <label className="sl-form-field">
                                        <span className="sl-form-label">{t('settings.filtering.apiEndpointUrl')}</span>
                                        <input
                                            type="url"
                                            className="sl-input"
                                            placeholder={t('settings.filtering.apiEndpointPlaceholder')}
                                            value={routing.remoteApi.endpointUrl}
                                            onChange={(e) => saveRouting({
                                                ...routing,
                                                remoteApi: { ...routing.remoteApi, enabled: true, endpointUrl: e.target.value },
                                            })}
                                        />
                                    </label>
                                    <label className="sl-form-field">
                                        <span className="sl-form-label">{t('settings.filtering.apiKeyOptional')}</span>
                                        <input
                                            type="password"
                                            className="sl-input"
                                            placeholder={t('settings.filtering.apiKeyPlaceholder')}
                                            value={routing.remoteApi.apiKey}
                                            onChange={(e) => saveRouting({
                                                ...routing,
                                                remoteApi: { ...routing.remoteApi, enabled: true, apiKey: e.target.value },
                                            })}
                                        />
                                    </label>
                                    <p className="muted" style={{ fontSize: '0.8rem', marginBottom: 0 }}>
                                        {t('settings.filtering.remoteApiStatus', {
                                            status: runtimeStatus.remoteApiReady
                                                ? t('settings.filtering.remoteApiConfigured')
                                                : t('settings.filtering.remoteApiNotConfigured'),
                                        })}
                                    </p>
                                </div>
                            ) : null}
                        </details>
                    </>
                ) : (
                    <div className="sl-kv-grid">
                        <span className="label">{t('settings.filtering.modeLabel')}</span>
                        <span className="value">{t('settings.filtering.heuristicOffline')}</span>
                    </div>
                )}
            </div>

            <div className="card policy-card">
                <h3>{t('settings.filtering.sensitivityHeading')}</h3>
                <p className="muted" style={{ marginTop: 0, fontSize: '0.85rem' }}>
                    {t('settings.filtering.sensitivityDescription')}
                </p>
                <div className="sl-choice-list">
                    {SENSITIVITY_PRESETS.map((preset) => (
                        <button
                            key={preset}
                            type="button"
                            className={`sl-choice-item${policy.preset === preset ? ' is-active' : ''}`}
                            onClick={() => setPreset(preset)}
                        >
                            <span className="sl-choice-item-body">
                                <strong>
                                    {t(`wizard.sensitivityPresets.${preset}.label`)}
                                    {preset === 'balanced' ? (
                                        <span className="sl-badge-recommended">
                                            {t('wizard.mode.recommended')}
                                        </span>
                                    ) : null}
                                </strong>
                                <span className="muted sl-choice-item-hint">
                                    {t(`wizard.sensitivityPresets.${preset}.hint`)}
                                </span>
                            </span>
                        </button>
                    ))}
                </div>
                <p className="sl-filtering-threshold">
                    {t('settings.filtering.threshold', { percent: (policy.threshold * 100).toFixed(0) })}
                </p>
            </div>

            <div className="card policy-card sl-span-full">
                <h3>{t('settings.filtering.detectorsHeading')}</h3>
                <p className="muted" style={{ marginTop: 0, fontSize: '0.85rem' }}>
                    {t('settings.filtering.detectorsDescription')}
                </p>
                <ul className="sl-detector-list">
                    {enabledDetectors.map((mod) => {
                        const localized = getLocalizedModFields(mod, t);
                        return (
                            <li key={mod.id} className="sl-detector-item">
                                <strong>{localized.name}</strong>
                                <span className="muted">{localized.description}</span>
                            </li>
                        );
                    })}
                </ul>
                {onNavigateRules ? (
                    <button type="button" className="sl-btn-text" onClick={onNavigateRules}>
                        {t('settings.filtering.editKeywordsLink')}
                    </button>
                ) : null}
            </div>

            <section className="sl-filtering-section sl-span-full">
                <h3 className="sl-filtering-section-title">{t('settings.filtering.presentHeading')}</h3>
                <p className="muted sl-filtering-section-desc">{t('settings.filtering.presentDescription')}</p>
            </section>

            <div className="card policy-card sl-span-full">
                <h3>{t('settings.filtering.filterStyleHeading')}</h3>
                <p className="muted" style={{ marginTop: 0, fontSize: '0.85rem' }}>
                    {t('settings.filtering.filterStyleDescription')}
                </p>
                {!isFullBuild() && visibleStyles.length === 1 ? (
                    <p className="sl-wizard-callout">{t('wizard.style.coreBuildNote')}</p>
                ) : null}
                <div className="sl-choice-list">
                    {visibleStyles.map((action) => (
                        <button
                            key={action.id}
                            type="button"
                            className={`sl-choice-item sl-choice-item--with-preview${
                                enforcementAction.activeActionId === action.id ? ' is-active' : ''
                            }`}
                            onClick={() => setActionId(action.id)}
                        >
                            <span className="sl-choice-item-body">
                                <strong>{action.label}</strong>
                                <span className="muted sl-choice-item-hint">
                                    {t('wizard.style.previewLabel')}
                                </span>
                            </span>
                            <FilterStylePreview styleId={action.id} />
                        </button>
                    ))}
                </div>
            </div>

            {isFullBuild() ? (
                <details className="sl-install-details sl-span-full">
                    <summary>{t('settings.filtering.advancedPackSummary')}</summary>
                    <div className="card pack-card" style={{ marginTop: '0.75rem' }}>
                    <div className="pack-header">
                        <h3>{t('settings.filtering.languagePackHeading')}</h3>
                        <button
                            type="button"
                            className="pack-toggle-btn"
                            onClick={() => setShowPackSelector(!showPackSelector)}
                        >
                            {showPackSelector ? t('settings.filtering.hide') : t('settings.filtering.change')}
                        </button>
                    </div>
                    <p className="muted" style={{ marginTop: 0, fontSize: '0.85rem' }}>
                        {t('settings.filtering.languagePackDescription')}
                    </p>
                    <div className="pack-info">
                        <div className="stat-row">
                            <span className="label">{t('settings.filtering.detected')}</span>
                            <span className="value">
                                {t('settings.filtering.detectedConfidence', {
                                    language: packState.detectedLanguage.toUpperCase(),
                                    percent: (packState.detectedConfidence * 100).toFixed(0),
                                })}
                            </span>
                        </div>
                        <div className="stat-row">
                            <span className="label">{t('settings.filtering.active')}</span>
                            <span className="value">
                                {packState.availablePacks.find((p) => p.id === packState.selectedPackId)?.name ??
                                    packState.selectedPackId ??
                                    t('settings.filtering.autoSelecting')}
                                {packState.autoSelected ? t('settings.filtering.autoSuffix') : ''}
                            </span>
                        </div>
                    </div>
                    {showPackSelector ? (
                        <div className="pack-selector">
                            <h4>{t('settings.filtering.installedPacks')}</h4>
                            <div className="pack-list">
                                {packState.availablePacks.map((pack) => (
                                    <button
                                        key={pack.id}
                                        type="button"
                                        className={`pack-option ${packState.selectedPackId === pack.id ? 'active' : ''}`}
                                        onClick={() => {
                                            setPackState((prev) => ({
                                                ...prev,
                                                selectedPackId: pack.id,
                                                autoSelected: false,
                                            }));
                                            saveRouting({ ...routing, primaryMode: 'local-pack' });
                                            chrome.storage.local.set({
                                                preferredPackId: pack.id,
                                                preferredDetectorId: 'local-pack',
                                            });
                                        }}
                                    >
                                        <span className="pack-name">{pack.name}</span>
                                        <span className="pack-langs">{pack.languages.join(', ')}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : null}
                    </div>
                </details>
            ) : null}
        </div>
    );
}
