import { classifyBehaviorSignals } from '../../mods/detectors/behavior-signals/classify';
import { classifyNoisePatterns } from '../../mods/detectors/noise-patterns/patterns';
import {
    BEHAVIOR_SIGNALS_DETECTOR_ID,
    DEFAULT_LABEL_ID,
    HEURISTIC_DETECTOR_ID,
    NOISE_PATTERNS_DETECTOR_ID,
} from '../runtime/constants';
import type { DomContextSignals } from './dom-context-signals';
import { shouldClassifyText } from '../pipeline/text-gate';
import { scoreFromKeywordHits, isKeywordScoreBlocked } from '../rules/keyword-score';

export type FilterSignalContribution = {
    readonly detectorId: string;
    readonly labelId: string;
    readonly score: number;
    readonly matched: boolean;
};

export type UnifiedFilterResult = {
    readonly blocked: boolean;
    readonly gated: boolean;
    readonly threshold: number;
    readonly winner: FilterSignalContribution | null;
    readonly contributions: readonly FilterSignalContribution[];
};

export type UnifiedFilterOptions = {
    readonly threshold: number;
    readonly keywords: readonly string[];
    readonly enableNoisePatterns: boolean;
    readonly enableBehaviorSignals: boolean;
    readonly domContext?: DomContextSignals;
};

function pickWinner(contributions: readonly FilterSignalContribution[]): FilterSignalContribution | null {
    const matched = contributions.filter((c) => c.matched);
    if (matched.length === 0) return null;
    return [...matched].sort((a, b) => b.score - a.score)[0] ?? null;
}

/** Mirrors live pipeline logic for dashboard preview and audits. */
export function classifyUnifiedFilter(
    text: string,
    options: UnifiedFilterOptions
): UnifiedFilterResult {
    if (!shouldClassifyText(text)) {
        return {
            blocked: false,
            gated: true,
            threshold: options.threshold,
            winner: null,
            contributions: [],
        };
    }

    const heuristicScore = scoreFromKeywordHits(text, options.keywords);
    const heuristicMatched = isKeywordScoreBlocked(text, options.keywords, options.threshold);
    const contributions: FilterSignalContribution[] = [
        {
            detectorId: HEURISTIC_DETECTOR_ID,
            labelId: DEFAULT_LABEL_ID,
            score: heuristicScore,
            matched: heuristicMatched,
        },
    ];

    if (options.enableNoisePatterns) {
        const noise = classifyNoisePatterns(text, options.threshold);
        contributions.push({
            detectorId: NOISE_PATTERNS_DETECTOR_ID,
            labelId: noise.labelId,
            score: noise.score,
            matched: noise.matched,
        });
    }

    if (options.enableBehaviorSignals) {
        const behavior = classifyBehaviorSignals(text, options.threshold, options.domContext);
        contributions.push({
            detectorId: BEHAVIOR_SIGNALS_DETECTOR_ID,
            labelId: behavior.labelId,
            score: behavior.score,
            matched: behavior.matched,
        });
    }

    const blocked = contributions.some((c) => c.matched);
    return {
        blocked,
        gated: false,
        threshold: options.threshold,
        winner: blocked ? pickWinner(contributions) : null,
        contributions,
    };
}
