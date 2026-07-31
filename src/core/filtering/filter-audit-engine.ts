import type { AdaptationPageContext } from '../adaptation/page-context';
import { buildBrowsingModePatch } from '../modes/browsing-modes';
import {
    auditThresholdForMode,
    isBuiltinNonSocialHost,
    shouldApplySupplementaryDetectors,
} from './filtering-profile';
import { classifyUnifiedFilter } from './unified-filter';

export type AuditMode = 'focus' | 'research';

export type CorpusExpectation = 'pass' | 'block';

export type FilterCorpusSample = {
    readonly id: string;
    readonly text: string;
    readonly expect: CorpusExpectation;
    readonly note?: string;
    /** Defaults to social-feed when omitted (legacy dogfood samples). */
    readonly pageContexts?: readonly AdaptationPageContext[];
    readonly hostname?: string;
};

export type FilterCorpus = {
    readonly version: number;
    readonly samples: readonly FilterCorpusSample[];
};

export type FilterAuditMismatch = {
    readonly id: string;
    readonly expect: CorpusExpectation;
    readonly actual: CorpusExpectation;
    readonly note?: string;
    readonly text: string;
    readonly threshold: number;
    readonly winnerDetectorId: string | null;
    readonly winnerLabelId: string | null;
    readonly winnerScore: number | null;
    readonly gated: boolean;
};

export type FilterAuditReport = {
    readonly mode: AuditMode;
    readonly total: number;
    readonly passSamples: number;
    readonly blockSamples: number;
    readonly falsePositives: readonly FilterAuditMismatch[];
    readonly falseNegatives: readonly FilterAuditMismatch[];
    readonly falsePositiveRate: number;
    readonly accuracy: number;
};

export type FilterAuditSummary = {
    readonly generatedAt: string;
    readonly corpusVersion: number;
    readonly focus: FilterAuditReport;
    readonly research: FilterAuditReport;
    readonly nonSocialFocus: FilterAuditReport;
};

const DEFAULT_AUDIT_HOST = 'example.com';
const DEFAULT_AUDIT_CONTEXTS: readonly AdaptationPageContext[] = ['social-feed'];

function sampleContext(sample: FilterCorpusSample): {
    readonly pageContexts: readonly AdaptationPageContext[];
    readonly hostname: string;
} {
    return {
        pageContexts: sample.pageContexts ?? DEFAULT_AUDIT_CONTEXTS,
        hostname: sample.hostname ?? DEFAULT_AUDIT_HOST,
    };
}

export function classifyForAudit(
    text: string,
    mode: AuditMode,
    context: { readonly pageContexts?: readonly AdaptationPageContext[]; readonly hostname?: string } = {}
): ReturnType<typeof classifyUnifiedFilter> {
    const pageContexts = context.pageContexts ?? DEFAULT_AUDIT_CONTEXTS;
    const hostname = context.hostname ?? DEFAULT_AUDIT_HOST;
    const patch = buildBrowsingModePatch(mode);
    const supplementary = shouldApplySupplementaryDetectors(pageContexts);

    return classifyUnifiedFilter(text, {
        threshold: auditThresholdForMode(mode, hostname),
        keywords: patch.userRules.blockKeywords,
        enableNoisePatterns: supplementary,
        enableBehaviorSignals: supplementary,
    });
}

export function auditFilterCorpusForMode(
    corpus: FilterCorpus,
    mode: AuditMode,
    samples: readonly FilterCorpusSample[] = corpus.samples
): FilterAuditReport {
    const falsePositives: FilterAuditMismatch[] = [];
    const falseNegatives: FilterAuditMismatch[] = [];

    for (const sample of samples) {
        const ctx = sampleContext(sample);
        const result = classifyForAudit(sample.text, mode, ctx);
        const actual: CorpusExpectation = result.blocked ? 'block' : 'pass';
        if (actual === sample.expect) continue;

        const mismatch: FilterAuditMismatch = {
            id: sample.id,
            expect: sample.expect,
            actual,
            note: sample.note,
            text: sample.text,
            threshold: result.threshold,
            winnerDetectorId: result.winner?.detectorId ?? null,
            winnerLabelId: result.winner?.labelId ?? null,
            winnerScore: result.winner?.score ?? null,
            gated: result.gated,
        };
        if (sample.expect === 'pass') falsePositives.push(mismatch);
        else falseNegatives.push(mismatch);
    }

    const passSamples = samples.filter((s) => s.expect === 'pass').length;
    const blockSamples = samples.filter((s) => s.expect === 'block').length;
    const correct = samples.length - falsePositives.length - falseNegatives.length;

    return {
        mode,
        total: samples.length,
        passSamples,
        blockSamples,
        falsePositives,
        falseNegatives,
        falsePositiveRate: passSamples > 0 ? falsePositives.length / passSamples : 0,
        accuracy: samples.length > 0 ? correct / samples.length : 1,
    };
}

export function isNonSocialCorpusSample(sample: FilterCorpusSample): boolean {
    const contexts = sample.pageContexts ?? DEFAULT_AUDIT_CONTEXTS;
    if (contexts.length === 0) return true;
    const hostname = sample.hostname ?? '';
    return hostname.length > 0 && isBuiltinNonSocialHost(hostname);
}

export function buildFilterAuditSummary(corpus: FilterCorpus): FilterAuditSummary {
    const nonSocialSamples = corpus.samples.filter(isNonSocialCorpusSample);

    return {
        generatedAt: new Date().toISOString(),
        corpusVersion: corpus.version,
        focus: auditFilterCorpusForMode(corpus, 'focus'),
        research: auditFilterCorpusForMode(corpus, 'research'),
        nonSocialFocus: auditFilterCorpusForMode(corpus, 'focus', nonSocialSamples),
    };
}

export function formatFilterAuditSummary(summary: FilterAuditSummary): string {
    const lines = [
        `Filter audit — corpus v${summary.corpusVersion} @ ${summary.generatedAt}`,
        '',
        `Focus (balanced): ${summary.focus.falsePositives.length} FP / ${summary.focus.passSamples} pass samples, ${summary.focus.falseNegatives.length} FN / ${summary.focus.blockSamples} block samples, accuracy ${(summary.focus.accuracy * 100).toFixed(1)}%`,
        `Research (conservative): ${summary.research.falsePositives.length} FP / ${summary.research.passSamples} pass, ${summary.research.falseNegatives.length} FN / ${summary.research.blockSamples} block, accuracy ${(summary.research.accuracy * 100).toFixed(1)}%`,
        `Focus on non-social subset (${summary.nonSocialFocus.total} samples): ${summary.nonSocialFocus.falsePositives.length} FP, ${summary.nonSocialFocus.falseNegatives.length} FN`,
    ];

    for (const mode of ['focus', 'research'] as const) {
        const report = summary[mode];
        if (report.falsePositives.length === 0) continue;
        lines.push('', `${mode} false positives:`);
        for (const fp of report.falsePositives) {
            lines.push(
                `  - ${fp.id}: ${fp.note ?? ''} [${fp.winnerDetectorId ?? 'gated'} ${fp.winnerScore?.toFixed(2) ?? ''}]`
            );
        }
    }

    return lines.join('\n');
}

/** @deprecated Use {@link classifyForAudit} with mode `focus`. */
export function classifyFocusModeText(text: string) {
    const result = classifyForAudit(text, 'focus');
    const heuristic = result.contributions.find((c) => c.detectorId === 'heuristic-keywords');
    const noise = result.contributions.find((c) => c.detectorId === 'noise-patterns');
    return {
        blocked: result.blocked,
        heuristicScore: heuristic?.score ?? 0,
        noiseMatched: noise?.matched ?? false,
        gated: result.gated,
        noiseScore: noise?.score ?? 0,
    };
}

/** @deprecated Use {@link auditFilterCorpusForMode}. */
export function auditFilterCorpus(corpus: FilterCorpus): FilterAuditReport {
    return auditFilterCorpusForMode(corpus, 'focus');
}
