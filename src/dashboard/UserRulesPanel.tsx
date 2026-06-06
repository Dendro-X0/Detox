/// <reference types="chrome" />
import { useEffect, useState } from 'react';
import { DEFAULT_USER_RULES, type UserRulesSettings } from '../core/types/user-rules';
import { loadUserRules, saveUserRules } from '../core/rules/user-rules-store';
import { markSettingsCustomized } from '../core/modes/browsing-modes';
import { BOTHER_KEYWORD_MAP, type BotherCategory } from '../onboarding/types';
import { useLocale } from '../i18n/LocaleContext';
import RuleListEditor from './RuleListEditor';

const TOPIC_PRESET_IDS: readonly BotherCategory[] = [
    'outrage',
    'spam',
    'hostile',
    'engagement-bait',
    'low-effort',
];

export default function UserRulesPanel() {
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

    const addTopicPreset = (category: BotherCategory): void => {
        const additions = BOTHER_KEYWORD_MAP[category];
        const merged = [...new Set([...rules.blockKeywords, ...additions])];
        void persist({ ...rules, blockKeywords: merged });
    };

    const summaryParts = [
        t('rules.summary.block', { count: rules.blockKeywords.length }),
        t('rules.summary.allow', { count: rules.allowKeywords.length }),
    ];

    return (
        <div className="card policy-card">
            <h3>{t('rules.heading')}</h3>
            <p className="muted" style={{ marginTop: 0, fontSize: '0.85rem' }}>
                {t('rules.description')}
            </p>
            <p className="sl-rules-summary">{summaryParts.join(' · ')}</p>

            <div className="preset-buttons" style={{ marginBottom: '1rem' }}>
                {TOPIC_PRESET_IDS.map((id) => (
                    <button key={id} className="preset-btn" onClick={() => addTopicPreset(id)}>
                        + {t(`rules.topicPresets.${id}`)}
                    </button>
                ))}
            </div>

            <RuleListEditor
                title={t('rules.blockKeywords.title')}
                description={t('rules.blockKeywords.description')}
                values={rules.blockKeywords}
                placeholder={t('rules.blockKeywords.placeholder')}
                onChange={(blockKeywords) => { void persist({ ...rules, blockKeywords }); }}
                addLabel={t('rules.add')}
                removeLabel={t('rules.remove')}
                emptyLabel={t('rules.noEntries')}
            />

            <RuleListEditor
                title={t('rules.allowKeywords.title')}
                description={t('rules.allowKeywords.description')}
                values={rules.allowKeywords}
                placeholder={t('rules.allowKeywords.placeholder')}
                onChange={(allowKeywords) => { void persist({ ...rules, allowKeywords }); }}
                addLabel={t('rules.add')}
                removeLabel={t('rules.remove')}
                emptyLabel={t('rules.noEntries')}
            />

            {status ? <p className="muted" style={{ marginBottom: 0 }}>{status}</p> : null}
        </div>
    );
}
