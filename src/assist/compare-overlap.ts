export type CompareSnippetSide = {
    readonly text: string;
    readonly label: 'clip' | 'selection';
    readonly title?: string;
    readonly url?: string;
    readonly excerpt?: string;
};

export type CompareOverlapSummary = {
    readonly sharedTerms: readonly string[];
    readonly overlapScore: number;
    readonly noteKey: string;
};

export type AssistCompareReport = {
    readonly id: string;
    readonly createdAt: number;
    readonly sideA: CompareSnippetSide;
    readonly sideB: CompareSnippetSide;
    readonly overlap: CompareOverlapSummary;
    readonly combinedSearchUrl: string;
};

const TOKEN_PATTERN = /[a-z0-9]{4,}/gi;

function tokenize(text: string): Set<string> {
    const matches = text.toLowerCase().match(TOKEN_PATTERN) ?? [];
    return new Set(matches);
}

export function analyzeSnippetOverlap(a: string, b: string): CompareOverlapSummary {
    const tokensA = tokenize(a);
    const tokensB = tokenize(b);
    if (tokensA.size === 0 || tokensB.size === 0) {
        return {
            sharedTerms: [],
            overlapScore: 0,
            noteKey: 'assist.compare.overlap.empty',
        };
    }

    const shared = [...tokensA].filter((word) => tokensB.has(word));
    const union = new Set([...tokensA, ...tokensB]);
    const overlapScore = shared.length / union.size;
    const sharedTerms = [...shared].sort((left, right) => left.localeCompare(right)).slice(0, 8);

    let noteKey = 'assist.compare.overlap.partial';
    if (overlapScore < 0.05) {
        noteKey = 'assist.compare.overlap.distinct';
    } else if (overlapScore >= 0.35) {
        noteKey = 'assist.compare.overlap.similar';
    }

    return { sharedTerms, overlapScore, noteKey };
}

export function formatOverlapPercent(score: number): number {
    return Math.round(Math.min(1, Math.max(0, score)) * 100);
}
