import type { InferenceProvider } from '../../../core/types/detector';
import { classifyResultFromVerdict } from '../../../core/types/verdict';
import { shouldClassifyText } from '../../../core/pipeline/text-gate';
import {
    emptyTopicVerdict,
    verdictFromTopicClassification,
} from '../../../core/filtering/topic-classifier-policy';
import {
    getActiveTopicUserPolicy,
    loadTopicPolicy,
} from '../../../core/rules/topic-policy-store';
import { textMatchesAllowKeywords } from '../../../core/rules/user-rules-store';
import { TOPIC_CLASSIFIER_DETECTOR_ID } from '../../../core/runtime/constants';
import { topicClassifierSession } from './session';

export const topicClassifierProvider: InferenceProvider = {
    id: TOPIC_CLASSIFIER_DETECTOR_ID,
    detectorId: TOPIC_CLASSIFIER_DETECTOR_ID,
    kind: 'local',
    supports: (detectorId) => detectorId === TOPIC_CLASSIFIER_DETECTOR_ID,
    getRuntimeInfo: () => topicClassifierSession.getRuntimeInfo(),
    classifyBatch: async (items) => {
        await loadTopicPolicy();
        const policy = getActiveTopicUserPolicy();
        if (!policy) {
            return items.map((item) =>
                classifyResultFromVerdict(item.id, emptyTopicVerdict())
            );
        }

        const eligible = items.filter(
            (item) =>
                shouldClassifyText(item.text) && !textMatchesAllowKeywords(item.text)
        );
        if (eligible.length === 0) {
            return items.map((item) =>
                classifyResultFromVerdict(item.id, emptyTopicVerdict())
            );
        }

        try {
            await topicClassifierSession.ensureReady();
            const classifications = await topicClassifierSession.classifyBatch(
                eligible.map((item) => item.text)
            );
            const byId = new Map<string, ReturnType<typeof verdictFromTopicClassification>>();
            for (let i = 0; i < eligible.length; i += 1) {
                const item = eligible[i]!;
                const classification = classifications[i]!;
                byId.set(item.id, verdictFromTopicClassification(classification, policy));
            }

            return items.map((item) => {
                const verdict = byId.get(item.id);
                if (verdict) {
                    return classifyResultFromVerdict(item.id, verdict);
                }
                return classifyResultFromVerdict(item.id, emptyTopicVerdict());
            });
        } catch {
            return items.map((item) =>
                classifyResultFromVerdict(item.id, emptyTopicVerdict())
            );
        }
    },
};
