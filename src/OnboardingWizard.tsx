/// <reference types="chrome" />
import { useMemo, useState } from 'react';
import './App.css';
import type { EnforcementActionId } from './core/types/enforcement';
import { DEFAULT_ENFORCEMENT_ACTION_SETTINGS } from './core/types/enforcement';
import type { PolicyPreset } from './core/types/policy';
import { isFullBuild } from './build-profile';
import { applyOnboardingDraft } from './onboarding/apply-onboarding';
import type { BotherCategory, OnboardingDraft, PreferredSite } from './onboarding/types';

type WizardStep = 'welcome' | 'bothers' | 'style' | 'sites' | 'sensitivity' | 'done';

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
    { id: 'dim', label: 'Dim' },
    { id: 'blur', label: 'Blur', fullOnly: true },
    { id: 'collapse', label: 'Collapse', fullOnly: true },
];

type OnboardingWizardProps = {
    readonly onComplete: () => void;
};

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
        if (step === 'welcome') setStep('bothers');
        else if (step === 'bothers') setStep('style');
        else if (step === 'style') setStep('sites');
        else if (step === 'sites') setStep('sensitivity');
        else if (step === 'sensitivity') void finish();
    };

    const back = (): void => {
        if (step === 'bothers') setStep('welcome');
        else if (step === 'style') setStep('bothers');
        else if (step === 'sites') setStep('style');
        else if (step === 'sensitivity') setStep('sites');
    };

    return (
        <div className="container options-dashboard wizard-container">
            <h1>Welcome to SignalLens</h1>
            <p className="muted">Set up your browsing preferences in under a minute.</p>

            {step === 'welcome' ? (
                <div className="card policy-card">
                    <h3>Step 1: Welcome</h3>
                    <p className="muted" style={{ marginTop: 0 }}>
                        SignalLens helps you reduce low-value content while you browse. You stay in control: filtered items can always be revealed.
                    </p>
                    <p className="muted">Default mode is local and offline-friendly. No account required.</p>
                </div>
            ) : null}

            {step === 'bothers' ? (
                <div className="card policy-card">
                    <h3>Step 2: What bothers you?</h3>
                    <p className="muted" style={{ marginTop: 0 }}>We will use these topics as keyword signals in heuristic mode.</p>
                    <div className="preset-buttons">
                        {BOTHER_OPTIONS.map((option) => (
                            <label key={option.id} className={`preset-btn${bothers.includes(option.id) ? ' active' : ''}`}>
                                <input
                                    type="checkbox"
                                    checked={bothers.includes(option.id)}
                                    onChange={() => toggleBother(option.id)}
                                    style={{ marginRight: '0.5rem' }}
                                />
                                {option.label}
                            </label>
                        ))}
                    </div>
                </div>
            ) : null}

            {step === 'style' ? (
                <div className="card policy-card">
                    <h3>Step 3: Filter style</h3>
                    <div className="preset-buttons">
                        {visibleStyles.map((style) => (
                            <button
                                key={style.id}
                                className={`preset-btn${actionId === style.id ? ' active' : ''}`}
                                onClick={() => setActionId(style.id)}
                            >
                                {style.label}
                            </button>
                        ))}
                    </div>
                </div>
            ) : null}

            {step === 'sites' ? (
                <div className="card policy-card">
                    <h3>Step 4: Sites you browse</h3>
                    <p className="muted" style={{ marginTop: 0 }}>Select where you want optimized extraction behavior.</p>
                    <div className="preset-buttons">
                        {visibleSites.map((site) => (
                            <label key={site.id} className={`preset-btn${sites.includes(site.id) ? ' active' : ''}`}>
                                <input
                                    type="checkbox"
                                    checked={sites.includes(site.id)}
                                    onChange={() => toggleSite(site.id)}
                                    style={{ marginRight: '0.5rem' }}
                                />
                                {site.label}
                            </label>
                        ))}
                    </div>
                </div>
            ) : null}

            {step === 'sensitivity' ? (
                <div className="card policy-card">
                    <h3>Step 5: Sensitivity</h3>
                    <div className="preset-buttons">
                        {(['conservative', 'balanced', 'strict'] as PolicyPreset[]).map((value) => (
                            <button
                                key={value}
                                className={`preset-btn${preset === value ? ' active' : ''}`}
                                onClick={() => setPreset(value)}
                            >
                                {value === 'conservative' ? 'Conservative (fewer matches)' : value === 'strict' ? 'Strict (more matches)' : 'Balanced'}
                            </button>
                        ))}
                    </div>
                </div>
            ) : null}

            <div className="wizard-actions">
                {step !== 'welcome' ? (
                    <button className="preset-btn" onClick={back} disabled={saving}>Back</button>
                ) : null}
                <button className="preset-btn active" onClick={next} disabled={saving}>
                    {step === 'sensitivity' ? (saving ? 'Saving...' : 'Finish setup') : 'Continue'}
                </button>
            </div>
        </div>
    );
}
