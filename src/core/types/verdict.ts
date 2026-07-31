/**
 * Task-neutral classification result.
 * "matched" means the active policy considers this block actionable (e.g. filter/dim).
 */
import type { DomContextSignals } from '../filtering/dom-context-signals';

export type Verdict = {
    readonly matched: boolean;
    readonly score: number;
    readonly labelId: string;
    readonly detectorId: string;
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
};

export function verdictFromClassifyResult(result: ClassifyItemResult): Verdict {
    return {
        matched: result.matched,
        score: result.score,
        labelId: result.labelId,
        detectorId: result.detectorId,
    };
}

export function classifyResultFromVerdict(id: string, verdict: Verdict): ClassifyItemResult {
    return {
        id,
        matched: verdict.matched,
        score: verdict.score,
        labelId: verdict.labelId,
        detectorId: verdict.detectorId,
    };
}
