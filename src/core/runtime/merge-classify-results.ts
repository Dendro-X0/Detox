import type { ClassifyItemResult } from '../types/verdict';
import { TOPIC_CLASSIFIER_DETECTOR_ID } from './constants';

/**
 * Merges supplemental detector results into primary results (OR semantics).
 * When either detector matches, the higher score wins; matched is true if either matched.
 * Topic classifier matches take badge priority over noise detectors.
 */
export function mergeClassifyResults(
    primary: readonly ClassifyItemResult[],
    supplemental: readonly ClassifyItemResult[]
): readonly ClassifyItemResult[] {
    const supplementalById = new Map(supplemental.map((result) => [result.id, result]));

    return primary.map((primaryResult) => {
        const extra = supplementalById.get(primaryResult.id);
        if (!extra) return primaryResult;

        const matched = primaryResult.matched || extra.matched;
        const topicMatch =
            extra.detectorId === TOPIC_CLASSIFIER_DETECTOR_ID && extra.matched;
        const winner = topicMatch
            ? extra
            : primaryResult.score >= extra.score
              ? primaryResult
              : extra;

        return {
            ...winner,
            matched,
        };
    });
}
