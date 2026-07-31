import type { BotherCategory } from '../onboarding/types';
import {
    disableTopicPreset,
    enableTopicPreset,
    isTopicPresetEnabled,
    TOPIC_PRESET_IDS,
} from '../core/rules/topic-preset-rules';
import { BOTHER_KEYWORD_MAP } from '../core/types/bother-keywords';
import { useLocale } from '../i18n/LocaleContext';

export type TopicPresetsPanelProps = {
    readonly blockKeywords: readonly string[];
    readonly onBlockKeywordsChange: (next: readonly string[]) => void;
};

export default function TopicPresetsPanel({
    blockKeywords,
    onBlockKeywordsChange,
}: TopicPresetsPanelProps) {
    const { t } = useLocale();

    const togglePreset = (category: BotherCategory, enabled: boolean): void => {
        onBlockKeywordsChange(
            enabled
                ? enableTopicPreset(category, blockKeywords)
                : disableTopicPreset(category, blockKeywords)
        );
    };

    return (
        <section className="sl-rules-section">
            <h4 className="sl-rules-section-title">{t('rules.topicPresetsHeading')}</h4>
            <p className="muted sl-rules-section-desc">{t('rules.topicPresetsDescription')}</p>
            <div className="sl-topic-presets">
                {TOPIC_PRESET_IDS.map((id) => {
                    const enabled = isTopicPresetEnabled(id, blockKeywords);
                    const hintKey = `rules.topicPresetHints.${id}`;
                    const hint = t(hintKey);
                    return (
                        <label
                            key={id}
                            className={`sl-topic-preset${enabled ? ' is-enabled' : ''}${id === 'geopolitics' ? ' sl-topic-preset--optional' : ''}`}
                        >
                            <input
                                type="checkbox"
                                checked={enabled}
                                onChange={(e) => togglePreset(id, e.target.checked)}
                            />
                            <span className="sl-topic-preset-body">
                                <span className="sl-topic-preset-title-row">
                                    <strong>{t(`rules.topicPresets.${id}`)}</strong>
                                    <span className="sl-topic-preset-count muted">
                                        {t('rules.topicPresetKeywordCount', {
                                            count: BOTHER_KEYWORD_MAP[id].length,
                                        })}
                                    </span>
                                </span>
                                {hint !== hintKey ? (
                                    <span className="muted sl-topic-preset-hint">{hint}</span>
                                ) : null}
                            </span>
                        </label>
                    );
                })}
            </div>
        </section>
    );
}
