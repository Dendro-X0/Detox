import type { InferenceProvider } from '../../../core/types/detector';
import { classifyResultFromVerdict } from '../../../core/types/verdict';
import { DEFAULT_CLASSIFY_THRESHOLD } from '../constants';
import { loadUserRules, textMatchesAllowKeywords } from '../../../core/rules/user-rules-store';
import { classifyBehaviorSignals, BEHAVIOR_SIGNALS_DETECTOR_ID } from './classify';

export { BEHAVIOR_SIGNALS_DETECTOR_ID };

export const behaviorSignalsProvider: InferenceProvider = {
    id: BEHAVIOR_SIGNALS_DETECTOR_ID,
    detectorId: BEHAVIOR_SIGNALS_DETECTOR_ID,
    kind: 'local',
    supports: (detectorId) => detectorId === BEHAVIOR_SIGNALS_DETECTOR_ID,
    getRuntimeInfo: () => ({
        state: 'ready',
        activePackId: null,
        lastError: null,
        hasSession: false,
    }),
    classifyBatch: async (items, options) => {
        await loadUserRules();
        const threshold = options.threshold ?? DEFAULT_CLASSIFY_THRESHOLD;
        return items.map((item) => {
            if (textMatchesAllowKeywords(item.text)) {
                return classifyResultFromVerdict(item.id, {
                    matched: false,
                    score: 0,
                    labelId: 'behavior',
                    detectorId: BEHAVIOR_SIGNALS_DETECTOR_ID,
                });
            }
            return classifyResultFromVerdict(
                item.id,
                classifyBehaviorSignals(item.text, threshold, item.context?.dom)
            );
        });
    },
};
