/// <reference types="chrome" />
import { useEffect, useState } from 'react';
import {
    BUILTIN_BROWSING_MODES,
    applyBrowsingMode,
    loadActiveBrowsingModeId,
    type BrowsingModeId,
} from '../core/modes/browsing-modes';
import {
    DEFAULT_POLICY,
    PRESET_THRESHOLDS,
    type PolicyPreset,
    type PolicySettings,
} from '../core/types/policy';
import { useLocale } from '../i18n/LocaleContext';

/**
 * Secondary steer control — mode + sensitivity only (no keyword lists).
 * @see docs/planning/invisible-noise-engine.md
 */
export default function AutomaticQuietingCard() {
    const { t } = useLocale();
    const [modeId, setModeId] = useState<BrowsingModeId | null>('focus');
    const [policy, setPolicy] = useState<PolicySettings>(DEFAULT_POLICY);
    const [status, setStatus] = useState<string | null>(null);

    useEffect(() => {
        void (async () => {
            const active = await loadActiveBrowsingModeId();
            setModeId(active ?? 'focus');
            const stored = await chrome.storage.local.get('policy');
            const next = (stored as { readonly policy?: PolicySettings }).policy;
            if (next && typeof next.threshold === 'number') {
                setPolicy(next);
            }
        })();
    }, []);

    const applyMode = async (id: BrowsingModeId): Promise<void> => {
        await applyBrowsingMode(id);
        setModeId(id);
        setStatus(t('settings.preferences.quieting.saved'));
        window.setTimeout(() => setStatus(null), 1500);
    };

    const applySensitivity = async (preset: PolicyPreset): Promise<void> => {
        const next: PolicySettings = {
            ...policy,
            preset,
            threshold: PRESET_THRESHOLDS[preset],
        };
        setPolicy(next);
        await chrome.storage.local.set({ policy: next });
        setStatus(t('settings.preferences.quieting.saved'));
        window.setTimeout(() => setStatus(null), 1500);
    };

    return (
        <div className="card policy-card">
            <h3>{t('settings.preferences.quieting.heading')}</h3>
            <p className="muted" style={{ marginTop: 0, fontSize: '0.85rem' }}>
                {t('settings.preferences.quieting.description')}
            </p>

            <label className="sl-form-field" style={{ marginTop: '0.75rem' }}>
                <span className="sl-form-label">{t('settings.preferences.quieting.modeLabel')}</span>
                <select
                    className="sl-input"
                    value={modeId ?? 'focus'}
                    onChange={(e) => {
                        void applyMode(e.target.value as BrowsingModeId);
                    }}
                >
                    {BUILTIN_BROWSING_MODES.map((mode) => (
                        <option key={mode.id} value={mode.id}>
                            {t(`browsingModes.${mode.id}.label`)}
                        </option>
                    ))}
                </select>
            </label>

            <label className="sl-form-field" style={{ marginTop: '0.75rem' }}>
                <span className="sl-form-label">{t('settings.preferences.quieting.sensitivityLabel')}</span>
                <select
                    className="sl-input"
                    value={policy.preset}
                    onChange={(e) => {
                        void applySensitivity(e.target.value as PolicyPreset);
                    }}
                >
                    {(['conservative', 'balanced', 'strict'] as const).map((id) => (
                        <option key={id} value={id}>
                            {t(`wizard.sensitivityPresets.${id}.label`)}
                        </option>
                    ))}
                </select>
            </label>

            <p className="muted" style={{ fontSize: '0.8rem', marginBottom: 0, marginTop: '0.75rem' }}>
                {t('settings.preferences.quieting.hint')}
            </p>
            {status ? <p className="muted" style={{ marginBottom: 0 }}>{status}</p> : null}
        </div>
    );
}
