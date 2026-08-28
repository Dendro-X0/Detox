/**
 * Task-neutral classification result.
 * "matched" means the active policy considers this block actionable (e.g. filter/dim).
 */
import type { DomContextSignals } from '../filtering/dom-context-signals';

/** Extra matched signal kept when topic wins the badge over noise (P1-L2). */
export type SecondaryMatchReason = {
    readonly labelId: string;
    readonly detectorId: string;
    readonly score: number;
};

export type Verdict = {
    readonly matched: boolean;
    readonly score: number;
    readonly labelId: string;
    readonly detectorId: string;
    /** Noise (or other) matches shown alongside a topic primary badge. */
    readonly secondaryReasons?: readonly SecondaryMatchReason[];
};

export type ClassifyItemContext = {
    readonly dom?: DomContextSignals;
};

export type ClassifyItemInput = {
    readonly id: string;
    readonly text: string;
    readonly context?: ClassifyItemContext;
};

export type ClassifyItemResult = {
    readonly id: string;
    readonly matched: boolean;
    readonly score: number;
    readonly labelId: string;
    readonly detectorId: string;
    readonly secondaryReasons?: readonly SecondaryMatchReason[];
};

export function verdictFromClassifyResult(result: ClassifyItemResult): Verdict {
    return {
        matched: result.matched,
        score: result.score,
        labelId: result.labelId,
        detectorId: result.detectorId,
        ...(result.secondaryReasons?.length
            ? { secondaryReasons: result.secondaryReasons }
            : {}),
    };
}

export function classifyResultFromVerdict(id: string, verdict: Verdict): ClassifyItemResult {
    return {
        id,
        matched: verdict.matched,
        score: verdict.score,
        labelId: verdict.labelId,
        detectorId: verdict.detectorId,
        ...(verdict.secondaryReasons?.length
            ? { secondaryReasons: verdict.secondaryReasons }
            : {}),
    };
}
