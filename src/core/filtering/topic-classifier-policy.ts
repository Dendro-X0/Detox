import type { Verdict } from '../types/verdict';
import { TOPIC_CLASSIFIER_DETECTOR_ID } from '../runtime/constants';
import type { TopicClassification } from './topic-audit-engine';
import { wouldBlockUnderTopicPolicy } from './topic-audit-engine';
import type { TopicUserPolicy } from './topic-types';

/** Map D1 classification + user policy to an enforcement verdict (topic layer only). */
export function verdictFromTopicClassification(
    classification: TopicClassification,
    policy: TopicUserPolicy
): Verdict | null {
    if (!wouldBlockUnderTopicPolicy(classification, policy)) return null;
    const topic = classification.primaryTopic;
    if (topic === 'unknown') return null;

    return {
        matched: true,
        score: classification.confidence,
        labelId: topic,
        detectorId: TOPIC_CLASSIFIER_DETECTOR_ID,
    };
}

export function emptyTopicVerdict(): Verdict {
    return {
        matched: false,
        score: 0,
        labelId: 'noise',
        detectorId: TOPIC_CLASSIFIER_DETECTOR_ID,
    };
}
