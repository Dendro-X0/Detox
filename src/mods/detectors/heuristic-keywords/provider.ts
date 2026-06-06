import type { InferenceProvider } from '../../../core/types/detector';
import type { Verdict } from '../../../core/types/verdict';
import { classifyResultFromVerdict } from '../../../core/types/verdict';
import {
    DEFAULT_CLASSIFY_THRESHOLD,
    DEFAULT_LABEL_ID,
    HEURISTIC_DETECTOR_ID,
} from '../constants';
import { loadUserRules, textMatchesAllowKeywords } from '../../../core/rules/user-rules-store';
import { scoreFromKeywordWeight } from '../../../core/rules/keyword-score';
import { weightedKeywordHits } from '../../../core/rules/keyword-match';
import { getActiveKeywords } from './keywords';

function classifyKeyword(text: string, threshold: number, keywords: readonly string[]): Verdict {
    const weight = weightedKeywordHits(text, keywords);
    if (weight <= 0) {
        return {
            matched: false,
            score: 0,
            labelId: DEFAULT_LABEL_ID,
            detectorId: HEURISTIC_DETECTOR_ID,
        };
    }
    const score = scoreFromKeywordWeight(weight);
    return {
        matched: score >= threshold,
        score,
        labelId: DEFAULT_LABEL_ID,
        detectorId: HEURISTIC_DETECTOR_ID,
    };
}

export const heuristicKeywordsProvider: InferenceProvider = {
    id: HEURISTIC_DETECTOR_ID,
    detectorId: HEURISTIC_DETECTOR_ID,
    kind: 'local',
    supports: (detectorId) => detectorId === HEURISTIC_DETECTOR_ID || detectorId === 'heuristic',
    getRuntimeInfo: () => ({
        state: 'ready',
        activePackId: null,
        lastError: null,
        hasSession: false,
    }),
    classifyBatch: async (items, options) => {
        await loadUserRules();
        const threshold = options.threshold ?? DEFAULT_CLASSIFY_THRESHOLD;
        const keywords = await getActiveKeywords();
        return items.map((item) => {
            if (textMatchesAllowKeywords(item.text)) {
                return classifyResultFromVerdict(item.id, {
                    matched: false,
                    score: 0,
                    labelId: DEFAULT_LABEL_ID,
                    detectorId: HEURISTIC_DETECTOR_ID,
                });
            }
            return classifyResultFromVerdict(item.id, classifyKeyword(item.text, threshold, keywords));
        });
    },
};
