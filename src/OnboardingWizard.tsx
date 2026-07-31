/// <reference types="chrome" />
import { useEffect, useMemo, useState } from 'react';
import './App.css';
import DashboardShell from './dashboard/DashboardShell';
import type { EnforcementActionId } from './core/types/enforcement';
import { DEFAULT_ENFORCEMENT_ACTION_SETTINGS } from './core/types/enforcement';
import type { PolicyPreset } from './core/types/policy';
import { isFullBuild } from './build-profile';
import {
    BUILTIN_BROWSING_MODES,
    type BrowsingModeId,
} from './core/modes/browsing-modes';
import { useLocale } from './i18n/LocaleContext';
import { applyOnboardingDraft } from './onboarding/apply-onboarding';
import { loadOnboardingPrefill } from './onboarding/load-onboarding-prefill';
import { openWizardSamplePage } from './onboarding/sample-page';
import type { BotherCategory, OnboardingDraft } from './onboarding/types';
import FilterStylePreview from './dashboard/FilterStylePreview';
import {
    SITE_WHITELIST_PRESETS,
    type SiteWhitelistPresetId,
} from './core/rules/site-whitelist-presets';

type WizardStep = 'welcome' | 'language' | 'mode' | 'topics' | 'style' | 'sensitivity' | 'whitelist' | 'authenticity' | 'done';

type SetupPath = 'preset-mode' | 'custom';

export type WizardCompleteOptions = {
    readonly openSample?: boolean;
    /** When true (default for fine-tune), land on dashboard Overview after wizard. */
    readonly openDashboard?: boolean;
};

type OnboardingWizardProps = {
    readonly onComplete: (options?: WizardCompleteOptions) => void;
};

const BOTHER_IDS: readonly BotherCategory[] = [
    'outrage',
    'spam',
    'hostile',
    'engagement-bait',
    'low-effort',
    'geopolitics',
];

const FILTER_STYLE_IDS: readonly { readonly id: EnforcementActionId; readonly fullOnly?: boolean }[] = [
    { id: 'dim' },
    { id: 'blur', fullOnly: true },
    { id: 'collapse', fullOnly: true },
];

const SENSITIVITY_IDS: readonly PolicyPreset[] = ['conservative', 'balanced', 'strict'];

const CUSTOM_STEPS: readonly WizardStep[] = ['welcome', 'language', 'mode', 'topics', 'style', 'sensitivity', 'whitelist', 'authenticity', 'done'];
const PRESET_STEPS: readonly WizardStep[] = ['welcome', 'language', 'mode', 'whitelist', 'authenticity', 'done'];

const RECOMMENDED_MODE_ID: BrowsingModeId = 'focus';

function stepLabelsForPath(
    setupPath: SetupPath | null,
    t: (key: string) => string
): readonly string[] {
    const keys =
        setupPath === 'custom'
            ? [
                  'wizard.stepLabels.welcome',
                  'wizard.stepLabels.language',
                  'wizard.stepLabels.mode',
                  'wizard.stepLabels.topics',
                  'wizard.stepLabels.style',
                  'wizard.stepLabels.sensitivity',
                  'wizard.stepLabels.whitelist',
                  'wizard.stepLabels.authenticity',
                  'wizard.stepLabels.done',
              ]
            : [
                  'wizard.stepLabels.welcome',
                  'wizard.stepLabels.language',
                  'wizard.stepLabels.mode',
                  'wizard.stepLabels.whitelist',
                  'wizard.stepLabels.authenticity',
                  'wizard.stepLabels.done',
              ];
    return keys.map((key) => t(key));
}

function OnboardingWizardContent({ onComplete }: OnboardingWizardProps) {
    const { localeId, availableLocales, browserSuggestedLocaleId, setLocaleId, t } = useLocale();
    const [step, setStep] = useState<WizardStep>('welcome');
    const [setupPath, setSetupPath] = useState<SetupPath | null>(null);
    const [browsingModeId, setBrowsingModeId] = useState<BrowsingModeId | null>(null);
    const [bothers, setBothers] = useState<readonly BotherCategory[]>(['outrage', 'spam']);
    const [actionId, setActionId] = useState<EnforcementActionId>(DEFAULT_ENFORCEMENT_ACTION_SETTINGS.activeActionId);
    const [preset, setPreset] = useState<PolicyPreset>('balanced');
    const [saving, setSaving] = useState(false);
    const [prefillReady, setPrefillReady] = useState(false);
    const [isSetupAgain, setIsSetupAgain] = useState(false);
    const [whitelistPresetIds, setWhitelistPresetIds] = useState<readonly SiteWhitelistPresetId[]>([]);
    const [authenticityEnabled, setAuthenticityEnabled] = useState(false);
    const [authenticityLlmApiKey, setAuthenticityLlmApiKey] = useState('');

    useEffect(() => {
        void loadOnboardingPrefill(navigator.language).then((prefill) => {
            setLocaleId(prefill.localeId);
            setIsSetupAgain(prefill.isSetupAgain);
            setWhitelistPresetIds(prefill.whitelistPresetIds);
            setAuthenticityEnabled(prefill.authenticityEnabled);
            setAuthenticityLlmApiKey(prefill.authenticityLlmApiKey);
            if (prefill.setupPath === 'preset-mode' && prefill.browsingModeId) {
                setSetupPath('preset-mode');
                setBrowsingModeId(prefill.browsingModeId);
            } else if (prefill.setupPath === 'custom') {
                setSetupPath('custom');
                setActionId(prefill.actionId);
                setPreset(prefill.preset);
                setBothers(prefill.bothers);
            } else if (!prefill.isSetupAgain) {
                setBrowsingModeId(RECOMMENDED_MODE_ID);
                setSetupPath('preset-mode');
            }
            setPrefillReady(true);
        });
    }, [setLocaleId]);

    const wizardStepLabels = useMemo(
        () => stepLabelsForPath(setupPath, t),
        [setupPath, t]
    );

    const visibleStyles = useMemo(
        () => FILTER_STYLE_IDS.filter((style) => !style.fullOnly || isFullBuild()),
        []
    );

    const browserSuggestedLabel = useMemo(() => {
        const match = availableLocales.find((entry) => entry.id === browserSuggestedLocaleId);
        return match?.nativeName ?? browserSuggestedLocaleId.toUpperCase();
    }, [availableLocales, browserSuggestedLocaleId]);

    const activeSteps = setupPath === 'custom' ? CUSTOM_STEPS : PRESET_STEPS;

    const progressMeta = useMemo(() => {
        const index = activeSteps.indexOf(step);
        return {
            current: index + 1,
            total: activeSteps.length,
            stepLabel: wizardStepLabels[index] ?? '',
            stepOfLabel: t('wizard.progress.stepOf', { current: index + 1, total: activeSteps.length }),
        };
    }, [activeSteps, step, wizardStepLabels, t]);

    const toggleBother = (id: BotherCategory): void => {
        setBothers((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
    };

    const selectPresetMode = (modeId: BrowsingModeId): void => {
        setSetupPath('preset-mode');
        setBrowsingModeId(modeId);
    };

    const selectCustomPath = (): void => {
        setSetupPath('custom');
        setBrowsingModeId(null);
    };

    const toggleWhitelistPreset = (presetId: SiteWhitelistPresetId): void => {
        setWhitelistPresetIds((current) =>
            current.includes(presetId)
                ? current.filter((id) => id !== presetId)
                : [...current, presetId]
        );
    };

    const buildDraft = (): OnboardingDraft => {
        const whitelist = whitelistPresetIds.length > 0 ? whitelistPresetIds : undefined;
        const authenticityAssist = authenticityEnabled
            ? {
                  enabled: true as const,
                  llmApiKey: authenticityLlmApiKey.trim() || undefined,
              }
            : undefined;
        if (setupPath === 'custom') {
            return {
                setupPath: 'custom',
                localeId,
                bothers,
                actionId,
                preset,
                whitelistPresetIds: whitelist,
                authenticityAssist,
            };
        }
        return {
            setupPath: 'preset-mode',
            browsingModeId: browsingModeId ?? RECOMMENDED_MODE_ID,
            localeId,
            whitelistPresetIds: whitelist,
            authenticityAssist,
        };
    };

    const finish = async (options?: WizardCompleteOptions): Promise<void> => {
        setSaving(true);
        await applyOnboardingDraft(buildDraft());
        if (options?.openSample) {
            openWizardSamplePage();
        }
        setSaving(false);
        onComplete(options);
    };

    const quickStart = async (): Promise<void> => {
        setSaving(true);
        await applyOnboardingDraft({
            setupPath: 'preset-mode',
            browsingModeId: RECOMMENDED_MODE_ID,
            localeId,
        });
        setSaving(false);
        onComplete({ openDashboard: true });
    };

    const next = (): void => {
        if (step === 'welcome') {
            setStep('language');
            return;
        }
        if (step === 'language') {
            setStep('mode');
            return;
        }
        if (step === 'mode') {
            if (setupPath === 'custom') {
                setStep('topics');
                return;
            }
            if (setupPath === 'preset-mode' && browsingModeId) {
                setStep('whitelist');
                return;
            }
            return;
        }
        if (step === 'topics') {
            setStep('style');
            return;
        }
        if (step === 'style') {
            setStep('sensitivity');
            return;
        }
        if (step === 'sensitivity') {
            setStep('whitelist');
            return;
        }
        if (step === 'whitelist') {
            setStep('authenticity');
            return;
        }
        if (step === 'authenticity') {
            setStep('done');
            return;
        }
        if (step === 'done') {
            void finish({ openDashboard: true });
        }
    };

    const back = (): void => {
        const index = activeSteps.indexOf(step);
        if (index > 0) setStep(activeSteps[index - 1]!);
    };

    const modeStepValid =
        setupPath === 'preset-mode' ? browsingModeId !== null : setupPath === 'custom';
    const topicsStepValid = bothers.length > 0;
    const stepValidationMessage =
        step === 'mode' && !modeStepValid
            ? t('wizard.mode.pickOne')
            : step === 'topics' && !topicsStepValid
              ? t('wizard.topics.pickAtLeastOne')
              : null;

    const canContinue =
        saving ||
        (step === 'mode' && !modeStepValid) ||
        (step === 'topics' && !topicsStepValid)
            ? false
            : true;

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent): void => {
            if (event.key !== 'Enter' || saving || !canContinue) return;
            if (event.target instanceof HTMLTextAreaElement) return;
            event.preventDefault();
            next();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [canContinue, next, saving]);

    const activeModeLabel =
        browsingModeId !== null ? t(`browsingModes.${browsingModeId}.label`) : null;

    const localeLabel =
        availableLocales.find((entry) => entry.id === localeId)?.nativeName ?? localeId.toUpperCase();

    const topicsSummary =
        setupPath === 'custom'
            ? t('wizard.done.topicsCount', { count: bothers.length })
            : activeModeLabel;

    const whitelistSummary =
        whitelistPresetIds.length > 0
            ? t('wizard.done.whitelistCount', { count: whitelistPresetIds.length })
            : t('wizard.whitelist.noneSelected');

    const reviewRows = useMemo(() => {
        const whitelistRow = { label: t('wizard.done.reviewWhitelist'), value: whitelistSummary };
        const authenticityRow = {
            label: t('wizard.done.reviewAuthenticity'),
            value: authenticityEnabled
                ? t('wizard.done.authenticityEnabled')
                : t('wizard.done.authenticityDisabled'),
        };
        if (setupPath === 'preset-mode') {
            return [
                { label: t('wizard.done.reviewMode'), value: activeModeLabel ?? '—' },
                { label: t('wizard.done.reviewLanguage'), value: localeLabel },
                whitelistRow,
                authenticityRow,
            ];
        }
        return [
            { label: t('wizard.done.reviewTopics'), value: topicsSummary },
            { label: t('wizard.done.reviewStyle'), value: t(`wizard.filterStyles.${actionId}`) },
            { label: t('wizard.done.reviewSensitivity'), value: t(`wizard.sensitivityPresets.${preset}.label`) },
            { label: t('wizard.done.reviewLanguage'), value: localeLabel },
            whitelistRow,
            authenticityRow,
        ];
    }, [
        actionId,
        activeModeLabel,
        authenticityEnabled,
        localeLabel,
        preset,
        setupPath,
        t,
        topicsSummary,
        whitelistSummary,
    ]);

    const footer = (
        <div className="sl-wizard-footer">
            <div className="sl-wizard-footer-start">
                {step !== 'welcome' ? (
                    <button type="button" className="sl-btn sl-btn-ghost" onClick={back} disabled={saving}>
                        {t('common.back')}
                    </button>
                ) : (
                    <button
                        type="button"
                        className="sl-btn sl-btn-ghost"
                        onClick={() => { void quickStart(); }}
                        disabled={saving || !prefillReady}
                    >
                        {saving ? t('common.saving') : t('wizard.welcome.quickStart')}
                    </button>
                )}
            </div>
            <div className="sl-wizard-footer-end">
                {step === 'done' ? (
                    <>
                        <button
                            type="button"
                            className="sl-btn sl-btn-ghost"
                            onClick={() => { void finish({ openDashboard: true }); }}
                            disabled={saving}
                        >
                            {saving ? t('common.saving') : t('wizard.done.fineTuneDashboard')}
                        </button>
                        <button
                            type="button"
                            className="sl-btn sl-btn-ghost"
                            onClick={() => { void finish({ openSample: true, openDashboard: false }); }}
                            disabled={saving}
                        >
                            {saving ? t('common.saving') : t('wizard.done.trySamplePage')}
                        </button>
                    </>
                ) : null}
                <button
                    type="button"
                    className="sl-btn sl-btn-primary"
                    onClick={next}
                    disabled={!canContinue}
                >
                    {step === 'done'
                        ? saving
                            ? t('common.saving')
                            : t('wizard.done.openDashboard')
                        : t('common.continue')}
                </button>
            </div>
        </div>
    );

    return (
        <DashboardShell
            title={t('wizard.shell.title')}
            subtitle={t('wizard.shell.subtitle')}
            wizardProgress={progressMeta}
            wizardStepIndex={progressMeta.current - 1}
            wizardStepLabels={wizardStepLabels}
            footer={footer}
        >
            <div key={step} className="sl-wizard-step-panel">
                {step === 'welcome' ? (
                    <div className="sl-panel">
                        <h3>{t('wizard.welcome.heading')}</h3>
                        <p className="muted" style={{ marginTop: 0 }}>
                            {t('wizard.welcome.body1')}
                        </p>
                        <p className="muted" style={{ marginBottom: 0 }}>
                            {t('wizard.welcome.body2')}
                        </p>
                        <p className="sl-wizard-callout sl-wizard-text-only-note">
                            {t('wizard.welcome.textOnlyLimitation')}
                        </p>
                        {isSetupAgain ? (
                            <p className="sl-wizard-callout">{t('wizard.welcome.setupAgainNote')}</p>
                        ) : (
                            <p className="muted" style={{ fontSize: '0.85rem', marginTop: '1rem' }}>
                                {t('wizard.welcome.quickStartHint')}
                            </p>
                        )}
                    </div>
                ) : null}

                {step === 'language' ? (
                    <div className="sl-panel">
                        <h3>{t('wizard.language.heading')}</h3>
                        <p className="muted" style={{ marginTop: 0 }}>
                            {t('wizard.language.description')}
                        </p>
                        <p className="muted" style={{ marginTop: 0, fontSize: '0.85rem' }}>
                            {t('wizard.language.browserDetected', { language: browserSuggestedLabel })}
                        </p>
                        {browserSuggestedLocaleId !== localeId ? (
                            <button
                                type="button"
                                className="sl-btn sl-btn-ghost sl-wizard-inline-action"
                                onClick={() => setLocaleId(browserSuggestedLocaleId)}
                            >
                                {t('wizard.language.useSuggested', { language: browserSuggestedLabel })}
                            </button>
                        ) : null}
                        <div className="sl-choice-list">
                            {availableLocales.map((locale) => (
                                <button
                                    key={locale.id}
                                    type="button"
                                    className={`sl-choice-item${localeId === locale.id ? ' is-active' : ''}`}
                                    onClick={() => setLocaleId(locale.id)}
                                >
                                    <span>
                                        <strong>{locale.nativeName}</strong>
                                        {locale.nativeName !== locale.englishName ? (
                                            <span className="muted" style={{ display: 'block', fontSize: '0.8rem' }}>
                                                {locale.englishName}
                                            </span>
                                        ) : null}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : null}

                {step === 'mode' ? (
                    <div className="sl-panel">
                        <h3>{t('wizard.mode.heading')}</h3>
                        <p className="muted" style={{ marginTop: 0 }}>
                            {t('wizard.mode.description')}
                        </p>
                        <div className="sl-choice-list">
                            {BUILTIN_BROWSING_MODES.map((mode) => (
                                <button
                                    key={mode.id}
                                    type="button"
                                    className={`sl-choice-item${
                                        setupPath === 'preset-mode' && browsingModeId === mode.id ? ' is-active' : ''
                                    }`}
                                    onClick={() => selectPresetMode(mode.id)}
                                >
                                    <span className="sl-choice-item-body">
                                        <strong>
                                            {t(`browsingModes.${mode.id}.label`)}
                                            {mode.id === RECOMMENDED_MODE_ID ? (
                                                <span className="sl-badge-recommended">
                                                    {t('wizard.mode.recommended')}
                                                </span>
                                            ) : null}
                                        </strong>
                                        <span className="muted sl-choice-item-hint">
                                            {t(`browsingModes.${mode.id}.description`)}
                                        </span>
                                    </span>
                                </button>
                            ))}
                            <button
                                type="button"
                                className={`sl-choice-item${setupPath === 'custom' ? ' is-active' : ''}`}
                                onClick={selectCustomPath}
                            >
                                <span className="sl-choice-item-body">
                                    <strong>{t('wizard.mode.customLabel')}</strong>
                                    <span className="muted sl-choice-item-hint">{t('wizard.mode.customHint')}</span>
                                </span>
                            </button>
                        </div>
                    </div>
                ) : null}

                {step === 'topics' ? (
                    <div className="sl-panel">
                        <h3>{t('wizard.topics.heading')}</h3>
                        <p className="muted" style={{ marginTop: 0 }}>
                            {t('wizard.topics.description')}
                        </p>
                        <p className="sl-wizard-callout">{t('wizard.topics.noiseVsTopicNote')}</p>
                        <div className="sl-choice-list">
                            {BOTHER_IDS.map((id) => (
                                <label
                                    key={id}
                                    className={`sl-choice-item${bothers.includes(id) ? ' is-active' : ''}`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={bothers.includes(id)}
                                        onChange={() => toggleBother(id)}
                                    />
                                    <span>{t(`wizard.botherCategories.${id}`)}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                ) : null}

                {step === 'style' ? (
                    <div className="sl-panel">
                        <h3>{t('wizard.style.heading')}</h3>
                        <p className="muted" style={{ marginTop: 0 }}>
                            {t('wizard.style.description')}
                        </p>
                        {!isFullBuild() && visibleStyles.length === 1 ? (
                            <p className="sl-wizard-callout">{t('wizard.style.coreBuildNote')}</p>
                        ) : null}
                        <div className="sl-choice-list">
                            {visibleStyles.map((style) => (
                                <button
                                    key={style.id}
                                    type="button"
                                    className={`sl-choice-item sl-choice-item--with-preview${
                                        actionId === style.id ? ' is-active' : ''
                                    }`}
                                    onClick={() => setActionId(style.id)}
                                >
                                    <span className="sl-choice-item-body">
                                        <strong>{t(`wizard.filterStyles.${style.id}`)}</strong>
                                        <span className="muted sl-choice-item-hint">
                                            {t('wizard.style.previewLabel')}
                                        </span>
                                    </span>
                                    <FilterStylePreview styleId={style.id} />
                                </button>
                            ))}
                        </div>
                    </div>
                ) : null}

                {step === 'sensitivity' ? (
                    <div className="sl-panel">
                        <h3>{t('wizard.sensitivity.heading')}</h3>
                        <p className="muted" style={{ marginTop: 0 }}>
                            {t('wizard.sensitivity.description')}
                        </p>
                        <div className="sl-choice-list">
                            {SENSITIVITY_IDS.map((id) => (
                                <button
                                    key={id}
                                    type="button"
                                    className={`sl-choice-item${preset === id ? ' is-active' : ''}`}
                                    onClick={() => setPreset(id)}
                                >
                                    <span className="sl-choice-item-body">
                                        <strong>
                                            {t(`wizard.sensitivityPresets.${id}.label`)}
                                            {id === 'balanced' ? (
                                                <span className="sl-badge-recommended">
                                                    {t('wizard.mode.recommended')}
                                                </span>
                                            ) : null}
                                        </strong>
                                        <span className="muted sl-choice-item-hint">
                                            {t(`wizard.sensitivityPresets.${id}.hint`)}
                                        </span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : null}

                {step === 'whitelist' ? (
                    <div className="sl-panel">
                        <h3>{t('wizard.whitelist.heading')}</h3>
                        <p className="muted" style={{ marginTop: 0 }}>
                            {t('wizard.whitelist.description')}
                        </p>
                        <div className="sl-whitelist-presets">
                            {SITE_WHITELIST_PRESETS.map((preset) => {
                                const enabled = whitelistPresetIds.includes(preset.id);
                                return (
                                    <label
                                        key={preset.id}
                                        className={`sl-whitelist-preset${enabled ? ' is-enabled' : ''}`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={enabled}
                                            onChange={() => toggleWhitelistPreset(preset.id)}
                                        />
                                        <span className="sl-whitelist-preset-body">
                                            <strong>
                                                {t(`whitelist.presets.${preset.id}.label`)}
                                                {preset.id === 'google-workspace' ? (
                                                    <span className="sl-badge-recommended">
                                                        {t('wizard.mode.recommended')}
                                                    </span>
                                                ) : null}
                                            </strong>
                                            <span className="muted">
                                                {t(`whitelist.presets.${preset.id}.hint`)}
                                            </span>
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                        <p className="muted" style={{ fontSize: '0.82rem', marginBottom: 0 }}>
                            {t('wizard.whitelist.skipHint')}
                        </p>
                    </div>
                ) : null}

                {step === 'authenticity' ? (
                    <div className="sl-panel">
                        <h3>{t('wizard.authenticity.heading')}</h3>
                        <p className="muted" style={{ marginTop: 0 }}>
                            {t('wizard.authenticity.description')}
                        </p>
                        <p className="sl-wizard-callout">{t('wizard.authenticity.experimentalNote')}</p>
                        <label className="sl-choice-item sl-choice-item--checkbox">
                            <input
                                type="checkbox"
                                checked={authenticityEnabled}
                                onChange={(event) => setAuthenticityEnabled(event.target.checked)}
                            />
                            <span className="sl-choice-item-body">
                                <strong>{t('wizard.authenticity.enableLabel')}</strong>
                                <span className="muted sl-choice-item-hint">
                                    {t('wizard.authenticity.enableHint')}
                                </span>
                            </span>
                        </label>
                        {authenticityEnabled ? (
                            <div className="sl-form-stack" style={{ marginTop: '1rem' }}>
                                <div className="sl-form-field">
                                    <label className="sl-form-label" htmlFor="wizard-authenticity-llm-key">
                                        {t('wizard.authenticity.llmApiKeyLabel')}
                                    </label>
                                    <input
                                        id="wizard-authenticity-llm-key"
                                        type="password"
                                        className="sl-input"
                                        placeholder={t('wizard.authenticity.llmApiKeyPlaceholder')}
                                        value={authenticityLlmApiKey}
                                        onChange={(event) => setAuthenticityLlmApiKey(event.target.value)}
                                    />
                                    <p className="sl-form-hint" style={{ marginBottom: 0 }}>
                                        {t('wizard.authenticity.llmApiKeyHint')}
                                    </p>
                                </div>
                            </div>
                        ) : null}
                        <p className="muted" style={{ fontSize: '0.82rem', marginBottom: 0 }}>
                            {t('wizard.authenticity.skipHint')}
                        </p>
                    </div>
                ) : null}

                {step === 'done' ? (
                    <div className="sl-panel">
                        <h3>{t('wizard.done.heading')}</h3>
                        <p className="muted" style={{ marginTop: 0 }}>
                            {setupPath === 'preset-mode' && activeModeLabel
                                ? t('wizard.done.summaryPreset', { mode: activeModeLabel })
                                : t('wizard.done.summaryCustom')}
                        </p>
                        <div className="sl-wizard-review">
                            <h4 className="sl-wizard-review-title">{t('wizard.done.reviewHeading')}</h4>
                            <dl className="sl-wizard-review-grid">
                                {reviewRows.map((row) => (
                                    <div key={row.label} className="sl-wizard-review-row">
                                        <dt>{row.label}</dt>
                                        <dd>{row.value}</dd>
                                    </div>
                                ))}
                            </dl>
                        </div>
                        <ul className="sl-handoff-list">
                            <li>{t('wizard.done.tipDashboardHandoff')}</li>
                            <li>{t('wizard.done.tipBrowse')}</li>
                            <li>{t('wizard.done.tipReveal')}</li>
                            <li>{t('wizard.done.tipFineTuneLater')}</li>
                        </ul>
                    </div>
                ) : null}
            </div>

            {stepValidationMessage ? (
                <p className="sl-wizard-validation" role="status">
                    {stepValidationMessage}
                </p>
            ) : null}
        </DashboardShell>
    );
}

export default function OnboardingWizard(props: OnboardingWizardProps) {
    return <OnboardingWizardContent {...props} />;
}
