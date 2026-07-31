import { isFullBuild } from '../build-profile';
import { isModEnabled, subscribeToEnabledModChanges } from '../core/mods/mod-enablement-store';
import {
    loadTopicPolicy,
    saveTopicPolicy,
    toggleTopicAllow,
    toggleTopicBlock,
    type TopicPolicySettings,
} from '../core/rules/topic-policy-store';
import { TOPIC_IDS, type TopicId } from '../core/filtering/topic-types';
import { useLocale } from '../i18n/LocaleContext';
import { useEffect, useState } from 'react';

const BLOCK_TOPIC_IDS: readonly TopicId[] = ['world-affairs', 'domestic-politics'];
const ALLOW_TOPIC_IDS: readonly TopicId[] = ['tech', 'music', 'culture-arts'];

export default function TopicDietPanel() {
    const { t } = useLocale();
    const [policy, setPolicy] = useState<TopicPolicySettings | null>(null);
    const [modEnabled, setModEnabled] = useState(() => isModEnabled('detector-topic-classifier'));

    useEffect(() => {
        void loadTopicPolicy().then(setPolicy);
        return subscribeToEnabledModChanges(() => {
            setModEnabled(isModEnabled('detector-topic-classifier'));
        });
    }, []);

    if (!isFullBuild() || !policy) return null;

    const persist = async (next: TopicPolicySettings): Promise<void> => {
        setPolicy(next);
        await saveTopicPolicy(next);
    };

    return (
        <section className="sl-rules-section sl-topic-diet">
            <h4 className="sl-rules-section-title">{t('rules.topicDiet.heading')}</h4>
            <p className="muted sl-rules-section-desc">{t('rules.topicDiet.description')}</p>
            <p className="sl-topic-diet-experimental muted">{t('rules.topicDiet.experimental')}</p>

            {!modEnabled ? (
                <p className="sl-topic-diet-mod-hint muted">{t('rules.topicDiet.modRequired')}</p>
            ) : null}

            <label className={`sl-topic-preset sl-topic-diet-master${policy.enabled ? ' is-enabled' : ''}`}>
                <input
                    type="checkbox"
                    checked={policy.enabled}
                    disabled={!modEnabled}
                    onChange={(e) => {
                        void persist({ ...policy, enabled: e.target.checked });
                    }}
                />
                <span className="sl-topic-preset-body">
                    <strong>{t('rules.topicDiet.enable')}</strong>
                </span>
            </label>

            <div className="sl-topic-diet-groups">
                <div>
                    <h5 className="sl-topic-diet-group-title">{t('rules.topicDiet.blockGroup')}</h5>
                    <div className="sl-topic-presets">
                        {BLOCK_TOPIC_IDS.map((topic) => (
                            <label
                                key={topic}
                                className={`sl-topic-preset${policy.blockTopics.includes(topic) ? ' is-enabled' : ''}`}
                            >
                                <input
                                    type="checkbox"
                                    checked={policy.blockTopics.includes(topic)}
                                    disabled={!modEnabled || !policy.enabled}
                                    onChange={(e) => {
                                        void persist(toggleTopicBlock(policy, topic, e.target.checked));
                                    }}
                                />
                                <span className="sl-topic-preset-body">
                                    <strong>{t(`rules.topicDiet.topics.${topic}`)}</strong>
                                </span>
                            </label>
                        ))}
                    </div>
                </div>

                <div>
                    <h5 className="sl-topic-diet-group-title">{t('rules.topicDiet.allowGroup')}</h5>
                    <div className="sl-topic-presets">
                        {ALLOW_TOPIC_IDS.map((topic) => (
                            <label
                                key={topic}
                                className={`sl-topic-preset${policy.allowTopics.includes(topic) ? ' is-enabled' : ''}`}
                            >
                                <input
                                    type="checkbox"
                                    checked={policy.allowTopics.includes(topic)}
                                    disabled={!modEnabled || !policy.enabled}
                                    onChange={(e) => {
                                        void persist(toggleTopicAllow(policy, topic, e.target.checked));
                                    }}
                                />
                                <span className="sl-topic-preset-body">
                                    <strong>{t(`rules.topicDiet.topics.${topic}`)}</strong>
                                </span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            <p className="muted sl-topic-diet-footnote">{t('rules.topicDiet.separateFromNoise')}</p>
        </section>
    );
}

/** Topic IDs exposed in UI (subset of taxonomy v0). */
export const TOPIC_DIET_UI_IDS = TOPIC_IDS;
