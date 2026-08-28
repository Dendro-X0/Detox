import type { ClassifyItemResult, SecondaryMatchReason } from '../types/verdict';
import { TOPIC_CLASSIFIER_DETECTOR_ID } from './constants';

const MAX_SECONDARY_REASONS = 2;

function isTopicResult(result: Pick<ClassifyItemResult, 'detectorId'>): boolean {
    return result.detectorId === TOPIC_CLASSIFIER_DETECTOR_ID;
}

function asSecondary(result: ClassifyItemResult): SecondaryMatchReason {
    return {
        labelId: result.labelId,
        detectorId: result.detectorId,
        score: result.score,
    };
}

function mergeSecondaryReasons(
    prior: readonly SecondaryMatchReason[] | undefined,
    next: SecondaryMatchReason
): readonly SecondaryMatchReason[] {
    const deduped = [...(prior ?? [])];
    if (!deduped.some((r) => r.detectorId === next.detectorId && r.labelId === next.labelId)) {
        deduped.unshift(next);
    }
    return deduped.slice(0, MAX_SECONDARY_REASONS);
}

/**
 * Merges supplemental detector results into primary results (OR semantics).
 * When either detector matches, the higher score wins; matched is true if either matched.
 * Topic classifier matches take **primary** badge priority over noise detectors, but the
 * displaced noise match is kept in `secondaryReasons` (P1-L2 — layers never silently merge).
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
        const topicMatch = isTopicResult(extra) && extra.matched;
        const winner = topicMatch
            ? extra
            : primaryResult.score >= extra.score
              ? primaryResult
              : extra;

        if (
            topicMatch &&
            primaryResult.matched &&
            !isTopicResult(primaryResult)
        ) {
            return {
                ...winner,
                matched: true,
                secondaryReasons: mergeSecondaryReasons(
                    primaryResult.secondaryReasons,
                    asSecondary(primaryResult)
                ),
            };
        }

        if (winner === primaryResult && primaryResult.secondaryReasons?.length) {
            return { ...winner, matched };
        }

        if (winner === extra && extra.matched && primaryResult.secondaryReasons?.length) {
            return {
                ...winner,
                matched,
                secondaryReasons: primaryResult.secondaryReasons,
            };
        }

        return {
            ...winner,
            matched,
        };
    });
}
