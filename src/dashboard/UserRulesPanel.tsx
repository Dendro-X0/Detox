/// <reference types="chrome" />
import { useEffect, useState } from 'react';
import { DEFAULT_USER_RULES, type UserRulesSettings } from '../core/types/user-rules';
import { loadUserRules, saveUserRules } from '../core/rules/user-rules-store';
import { markSettingsCustomized } from '../core/modes/browsing-modes';
import { useLocale } from '../i18n/LocaleContext';
import RuleListEditor from './RuleListEditor';
import TopicPresetsPanel from './TopicPresetsPanel';
import TopicDietPanel from './TopicDietPanel';

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

    const summaryParts = [
        t('rules.summary.block', { count: rules.blockKeywords.length }),
        t('rules.summary.allow', { count: rules.allowKeywords.length }),
    ];

    return (
        <div className="card policy-card sl-user-rules-panel">
            <h3>{t('rules.heading')}</h3>
            <p className="muted sl-rules-intro">{t('rules.description')}</p>
            <p className="sl-rules-summary">{summaryParts.join(' · ')}</p>

            <TopicPresetsPanel
                blockKeywords={rules.blockKeywords}
                onBlockKeywordsChange={(blockKeywords) => {
                    void persist({ ...rules, blockKeywords });
                }}
            />

            <TopicDietPanel />

            <section className="sl-rules-section">
                <RuleListEditor
                    title={t('rules.blockKeywords.title')}
                    description={t('rules.blockKeywords.description')}
                    values={rules.blockKeywords}
                    placeholder={t('rules.blockKeywords.placeholder')}
                    onChange={(blockKeywords) => { void persist({ ...rules, blockKeywords }); }}
                    addLabel={t('rules.add')}
                    removeLabel={t('rules.remove')}
                    emptyLabel={t('rules.noEntries')}
                    searchPlaceholder={t('rules.searchKeywords')}
                />
            </section>

            <section className="sl-rules-section">
                <RuleListEditor
                    title={t('rules.allowKeywords.title')}
                    description={t('rules.allowKeywords.description')}
                    values={rules.allowKeywords}
                    placeholder={t('rules.allowKeywords.placeholder')}
                    onChange={(allowKeywords) => { void persist({ ...rules, allowKeywords }); }}
                    addLabel={t('rules.add')}
                    removeLabel={t('rules.remove')}
                    emptyLabel={t('rules.noEntries')}
                    searchPlaceholder={t('rules.searchKeywords')}
                />
            </section>

            {status ? <p className="sl-rules-status muted">{status}</p> : null}
        </div>
    );
}
