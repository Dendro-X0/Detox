/// <reference types="chrome" />
import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_USER_RULES, type UserRulesSettings } from '../core/types/user-rules';
import { loadUserRules, saveUserRules } from '../core/rules/user-rules-store';
import {
    isPresetEnabled,
    setPresetEnabled,
    SITE_WHITELIST_PRESETS,
    type SiteWhitelistPresetId,
} from '../core/rules/site-whitelist-presets';
import { markSettingsCustomized } from '../core/modes/browsing-modes';
import { useLocale } from '../i18n/LocaleContext';
import RuleListEditor from './RuleListEditor';

function customWhitelistDomains(allowDomains: readonly string[]): readonly string[] {
    const presetDomains = new Set(
        SITE_WHITELIST_PRESETS.flatMap((preset) => preset.domains.map((domain) => domain.toLowerCase()))
    );
    return allowDomains.filter((domain) => !presetDomains.has(domain.toLowerCase()));
}

export default function SiteWhitelistPanel() {
    const { t } = useLocale();
    const [rules, setRules] = useState<UserRulesSettings>(DEFAULT_USER_RULES);
    const [status, setStatus] = useState<string | null>(null);

    useEffect(() => {
        void loadUserRules().then(setRules);
    }, []);

    const persist = async (next: UserRulesSettings): Promise<void> => {
        setRules(next);
        await saveUserRules(next);
        await markSettingsCustomized();
        setStatus(t('rules.saved'));
        window.setTimeout(() => setStatus(null), 1500);
    };

    const customDomains = useMemo(() => customWhitelistDomains(rules.allowDomains), [rules.allowDomains]);

    const togglePreset = (presetId: SiteWhitelistPresetId, enabled: boolean): void => {
        const preset = SITE_WHITELIST_PRESETS.find((entry) => entry.id === presetId);
        if (!preset) return;
        const allowDomains = setPresetEnabled(preset, rules.allowDomains, enabled);
        void persist({ ...rules, allowDomains });
    };

    return (
        <div className="card policy-card sl-whitelist-panel">
            <h3>{t('whitelist.heading')}</h3>
            <p className="muted" style={{ marginTop: 0, fontSize: '0.85rem' }}>
                {t('whitelist.description')}
            </p>
            <p className="sl-rules-summary">
                {t('whitelist.count', { count: rules.allowDomains.length })}
            </p>

            <section className="sl-whitelist-section">
                <h4 className="sl-whitelist-section-title">{t('whitelist.presetsHeading')}</h4>
                <p className="muted sl-whitelist-section-desc">{t('whitelist.presetsDescription')}</p>
                <div className="sl-whitelist-presets">
                    {SITE_WHITELIST_PRESETS.map((preset) => {
                        const enabled = isPresetEnabled(preset, rules.allowDomains);
                        return (
                            <label key={preset.id} className={`sl-whitelist-preset${enabled ? ' is-enabled' : ''}`}>
                                <input
                                    type="checkbox"
                                    checked={enabled}
                                    onChange={(e) => togglePreset(preset.id, e.target.checked)}
                                />
                                <span className="sl-whitelist-preset-body">
                                    <strong>{t(`whitelist.presets.${preset.id}.label`)}</strong>
                                    <span className="muted">{t(`whitelist.presets.${preset.id}.hint`)}</span>
                                    <span className="sl-whitelist-preset-meta muted">
                                        {t('whitelist.presetDomainCount', { count: preset.domains.length })}
                                    </span>
                                </span>
                            </label>
                        );
                    })}
                </div>
            </section>

            <RuleListEditor
                title={t('whitelist.customHeading')}
                description={t('whitelist.customDescription')}
                values={customDomains}
                placeholder={t('whitelist.placeholder')}
                onChange={(customOnly) => {
                    const fromPresets = SITE_WHITELIST_PRESETS.flatMap((preset) =>
                        isPresetEnabled(preset, rules.allowDomains) ? preset.domains : []
                    );
                    void persist({
                        ...rules,
                        allowDomains: [...new Set([...fromPresets, ...customOnly])],
                    });
                }}
                addLabel={t('rules.add')}
                removeLabel={t('rules.remove')}
                emptyLabel={t('whitelist.noCustomSites')}
            />

            {status ? <p className="muted" style={{ marginBottom: 0 }}>{status}</p> : null}
        </div>
    );
}
