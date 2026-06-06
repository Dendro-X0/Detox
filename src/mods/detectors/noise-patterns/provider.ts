import type { InferenceProvider } from '../../../core/types/detector';
import { classifyResultFromVerdict } from '../../../core/types/verdict';
import { DEFAULT_CLASSIFY_THRESHOLD, NOISE_PATTERNS_DETECTOR_ID } from '../constants';
import { loadUserRules, textMatchesAllowKeywords } from '../../../core/rules/user-rules-store';
import { classifyNoisePatterns } from './patterns';

export const noisePatternsProvider: InferenceProvider = {
    id: NOISE_PATTERNS_DETECTOR_ID,
    detectorId: NOISE_PATTERNS_DETECTOR_ID,
    kind: 'local',
    supports: (detectorId) => detectorId === NOISE_PATTERNS_DETECTOR_ID,
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
                    labelId: 'noise',
                    detectorId: NOISE_PATTERNS_DETECTOR_ID,
                });
            }
            return classifyResultFromVerdict(
                item.id,
                classifyNoisePatterns(item.text, threshold)
            );
        });
    },
};
