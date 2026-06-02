/// <reference types="chrome" />
import { useMemo, useState } from 'react';
import './App.css';
import DashboardShell from './dashboard/DashboardShell';
import type { EnforcementActionId } from './core/types/enforcement';
import { DEFAULT_ENFORCEMENT_ACTION_SETTINGS } from './core/types/enforcement';
import type { PolicyPreset } from './core/types/policy';
import { isFullBuild } from './build-profile';
import { applyOnboardingDraft } from './onboarding/apply-onboarding';
import type { BotherCategory, OnboardingDraft, PreferredSite } from './onboarding/types';

type WizardStep = 'welcome' | 'bothers' | 'style' | 'sites' | 'sensitivity';

const WIZARD_STEP_LABELS = ['Welcome', 'Topics', 'Style', 'Sites', 'Sensitivity'] as const;

const STEP_ORDER: readonly WizardStep[] = ['welcome', 'bothers', 'style', 'sites', 'sensitivity'];

const BOTHER_OPTIONS: readonly { readonly id: BotherCategory; readonly label: string }[] = [
    { id: 'outrage', label: 'Outrage and drama' },
    { id: 'spam', label: 'Spam and promotions' },
    { id: 'hostile', label: 'Hostile or insulting language' },
    { id: 'engagement-bait', label: 'Engagement bait headlines' },
    { id: 'low-effort', label: 'Low-effort comments' },
];

const SITE_OPTIONS: readonly { readonly id: PreferredSite; readonly label: string; readonly fullOnly?: boolean }[] = [
    { id: 'generic', label: 'All sites (generic)' },
    { id: 'reddit', label: 'Reddit', fullOnly: true },
    { id: 'youtube', label: 'YouTube', fullOnly: true },
    { id: 'quora', label: 'Quora', fullOnly: true },
];

const FILTER_STYLES: readonly { readonly id: EnforcementActionId; readonly label: string; readonly fullOnly?: boolean }[] = [
    { id: 'dim', label: 'Dim matched content' },
    { id: 'blur', label: 'Blur matched content', fullOnly: true },
    { id: 'collapse', label: 'Collapse matched content', fullOnly: true },
];

const SENSITIVITY_OPTIONS: readonly { readonly id: PolicyPreset; readonly label: string; readonly hint: string }[] = [
    { id: 'conservative', label: 'Conservative', hint: 'Fewer matches' },
    { id: 'balanced', label: 'Balanced', hint: 'Recommended default' },
    { id: 'strict', label: 'Strict', hint: 'More matches' },
];

type OnboardingWizardProps = {
    readonly onComplete: () => void;
};

function stepIndex(step: WizardStep): number {
    return STEP_ORDER.indexOf(step);
}

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
    const [step, setStep] = useState<WizardStep>('welcome');
    const [bothers, setBothers] = useState<readonly BotherCategory[]>(['outrage', 'spam']);
    const [actionId, setActionId] = useState<EnforcementActionId>(DEFAULT_ENFORCEMENT_ACTION_SETTINGS.activeActionId);
    const [sites, setSites] = useState<readonly PreferredSite[]>(['generic', 'reddit']);
    const [preset, setPreset] = useState<PolicyPreset>('balanced');
    const [saving, setSaving] = useState(false);

    const visibleSites = useMemo(
        () => SITE_OPTIONS.filter((site) => !site.fullOnly || isFullBuild()),
        []
    );
    const visibleStyles = useMemo(
        () => FILTER_STYLES.filter((style) => !style.fullOnly || isFullBuild()),
        []
    );

    const toggleBother = (id: BotherCategory): void => {
        setBothers((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
    };

    const toggleSite = (id: PreferredSite): void => {
        setSites((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
    };

    const finish = async (): Promise<void> => {
        setSaving(true);
        const draft: OnboardingDraft = {
            bothers: bothers.length > 0 ? bothers : ['outrage'],
            actionId,
            sites: sites.length > 0 ? sites : ['generic'],
            preset,
        };
        await applyOnboardingDraft(draft);
        setSaving(false);
        onComplete();
    };

    const next = (): void => {
        const index = stepIndex(step);
        if (index < STEP_ORDER.length - 1) {
            setStep(STEP_ORDER[index + 1]!);
            return;
        }
        void finish();
    };

    const back = (): void => {
        const index = stepIndex(step);
        if (index > 0) setStep(STEP_ORDER[index - 1]!);
    };

    const footer = (
        <>
            {step !== 'welcome' ? (
                <button type="button" className="sl-btn sl-btn-ghost" onClick={back} disabled={saving}>
                    Back
                </button>
            ) : (
                <span />
            )}
            <button type="button" className="sl-btn sl-btn-primary" onClick={next} disabled={saving}>
                {step === 'sensitivity' ? (saving ? 'Saving…' : 'Finish setup') : 'Continue'}
            </button>
        </>
    );

    return (
        <DashboardShell
            title="Welcome to SignalLens"
            subtitle="Set up your browsing preferences in under a minute."
            wizardStepIndex={stepIndex(step)}
            wizardStepLabels={WIZARD_STEP_LABELS}
            footer={footer}
        >
            {step === 'welcome' ? (
                <div className="sl-panel">
                    <h3>Your personal browsing layer</h3>
                    <p className="muted" style={{ marginTop: 0 }}>
                        SignalLens helps you reduce low-value content while you browse. You stay in control — filtered
                        items can always be revealed.
                    </p>
                    <p className="muted" style={{ marginBottom: 0 }}>
                        Default mode is local and offline-friendly. No account required.
                    </p>
                </div>
            ) : null}

            {step === 'bothers' ? (
                <div className="sl-panel">
                    <h3>What bothers you?</h3>
                    <p className="muted" style={{ marginTop: 0 }}>
                        We&apos;ll use these topics as keyword signals in heuristic mode.
                    </p>
                    <div className="sl-choice-list">
                        {BOTHER_OPTIONS.map((option) => (
                            <label
                                key={option.id}
                                className={`sl-choice-item${bothers.includes(option.id) ? ' is-active' : ''}`}
                            >
                                <input
                                    type="checkbox"
                                    checked={bothers.includes(option.id)}
                                    onChange={() => toggleBother(option.id)}
                                />
                                <span>{option.label}</span>
                            </label>
                        ))}
                    </div>
                </div>
            ) : null}

            {step === 'style' ? (
                <div className="sl-panel">
                    <h3>Filter style</h3>
                    <p className="muted" style={{ marginTop: 0 }}>
                        Choose how matched content appears. You can change this later in settings.
                    </p>
                    <div className="sl-choice-list">
                        {visibleStyles.map((style) => (
                            <button
                                key={style.id}
                                type="button"
                                className={`sl-choice-item${actionId === style.id ? ' is-active' : ''}`}
                                onClick={() => setActionId(style.id)}
                            >
                                {style.label}
                            </button>
                        ))}
                    </div>
                </div>
            ) : null}

            {step === 'sites' ? (
                <div className="sl-panel">
                    <h3>Sites you browse</h3>
                    <p className="muted" style={{ marginTop: 0 }}>
                        Select where you want optimized extraction behavior.
                    </p>
                    <div className="sl-choice-list">
                        {visibleSites.map((site) => (
                            <label
                                key={site.id}
                                className={`sl-choice-item${sites.includes(site.id) ? ' is-active' : ''}`}
                            >
                                <input
                                    type="checkbox"
                                    checked={sites.includes(site.id)}
                                    onChange={() => toggleSite(site.id)}
                                />
                                <span>{site.label}</span>
                            </label>
                        ))}
                    </div>
                </div>
            ) : null}

            {step === 'sensitivity' ? (
                <div className="sl-panel">
                    <h3>Sensitivity</h3>
                    <p className="muted" style={{ marginTop: 0 }}>
                        How aggressively should SignalLens flag content that matches your rules?
                    </p>
                    <div className="sl-choice-list">
                        {SENSITIVITY_OPTIONS.map((option) => (
                            <button
                                key={option.id}
                                type="button"
                                className={`sl-choice-item${preset === option.id ? ' is-active' : ''}`}
                                onClick={() => setPreset(option.id)}
                            >
                                <span>
                                    <strong>{option.label}</strong>
                                    <span className="muted" style={{ display: 'block', fontSize: '0.8rem' }}>
                                        {option.hint}
                                    </span>
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            ) : null}
        </DashboardShell>
    );
}
