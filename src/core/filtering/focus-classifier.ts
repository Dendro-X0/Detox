import { buildBrowsingModePatch } from '../modes/browsing-modes';
import { shouldClassifyText } from '../pipeline/text-gate';
import { scoreFromKeywordHits, isKeywordScoreBlocked } from '../rules/keyword-score';
import { PRESET_THRESHOLDS } from '../types/policy';
import { classifyNoisePatterns } from '../../mods/detectors/noise-patterns/patterns';

export type FocusClassifyResult = {
    readonly blocked: boolean;
    readonly heuristicScore: number;
    readonly noiseMatched: boolean;
    readonly gated: boolean;
    readonly noiseScore: number;
};

/** Pure Focus-mode classification (balanced threshold + noise-pattern mod). */
export function classifyFocusModeText(text: string): FocusClassifyResult {
    const patch = buildBrowsingModePatch('focus');
    const threshold = PRESET_THRESHOLDS.balanced;
    const keywords = patch.userRules.blockKeywords;

    if (!shouldClassifyText(text)) {
        return { blocked: false, heuristicScore: 0, noiseMatched: false, gated: true, noiseScore: 0 };
    }

    const heuristicScore = scoreFromKeywordHits(text, keywords);
    const heuristicBlocked = isKeywordScoreBlocked(text, keywords, threshold);
    const noise = classifyNoisePatterns(text, threshold);

    return {
        blocked: heuristicBlocked || noise.matched,
        heuristicScore,
        noiseMatched: noise.matched,
        noiseScore: noise.score,
        gated: false,
    };
}

export type CorpusExpectation = 'pass' | 'block';

export type FilterCorpusSample = {
    readonly id: string;
    readonly text: string;
    readonly expect: CorpusExpectation;
    readonly note?: string;
};

export type FilterCorpus = {
    readonly version: number;
    readonly mode: 'focus';
    readonly threshold: number;
    readonly samples: readonly FilterCorpusSample[];
};

export type FilterAuditMismatch = {
    readonly id: string;
    readonly expect: CorpusExpectation;
    readonly actual: CorpusExpectation;
    readonly note?: string;
    readonly text: string;
    readonly heuristicScore: number;
    readonly noiseMatched: boolean;
    readonly gated: boolean;
};

export type FilterAuditReport = {
    readonly total: number;
    readonly falsePositives: readonly FilterAuditMismatch[];
    readonly falseNegatives: readonly FilterAuditMismatch[];
    readonly accuracy: number;
};

export function auditFilterCorpus(corpus: FilterCorpus): FilterAuditReport {
    const falsePositives: FilterAuditMismatch[] = [];
    const falseNegatives: FilterAuditMismatch[] = [];

    for (const sample of corpus.samples) {
        const result = classifyFocusModeText(sample.text);
        const actual: CorpusExpectation = result.blocked ? 'block' : 'pass';
        if (actual === sample.expect) continue;

        const mismatch: FilterAuditMismatch = {
            id: sample.id,
            expect: sample.expect,
            actual,
            note: sample.note,
            text: sample.text,
            heuristicScore: result.heuristicScore,
            noiseMatched: result.noiseMatched,
            gated: result.gated,
        };
        if (sample.expect === 'pass') falsePositives.push(mismatch);
        else falseNegatives.push(mismatch);
    }

    const correct = corpus.samples.length - falsePositives.length - falseNegatives.length;
    return {
        total: corpus.samples.length,
        falsePositives,
        falseNegatives,
        accuracy: corpus.samples.length > 0 ? correct / corpus.samples.length : 1,
    };
}
