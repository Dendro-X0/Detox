export type AnalysisScope =
    | { readonly kind: 'selection'; readonly text: string; readonly blockId?: string }
    | { readonly kind: 'thread'; readonly rootBlockId: string; readonly maxReplies: number; readonly text: string }
    | { readonly kind: 'full_page'; readonly warnDenseSite: boolean; readonly text: string };

export type ClaimType = 'factual' | 'opinion' | 'prediction' | 'unknown';

export type Claim = {
    readonly id: string;
    readonly text: string;
    readonly sourceBlockId?: string;
    readonly type: ClaimType;
};

export type EpistemicStatus = 'unsupported' | 'disputed' | 'partially_supported' | 'unknown';

export type SourceStance = 'supports' | 'contradicts' | 'neutral' | 'unknown';

export type SourceReference = {
    readonly id: string;
    readonly url: string;
    readonly title: string;
    readonly snippet: string;
    readonly fetchedAt: number;
    readonly snippetVerified: boolean;
    readonly stance: SourceStance;
};

export type AuthenticityAssessment = {
    readonly claimId: string;
    readonly summary: string;
    readonly confidence: 'low' | 'medium' | 'high';
    readonly epistemicStatus: EpistemicStatus;
    readonly referenceIds: readonly string[];
    readonly limitations: string;
    readonly advisoryOnly: true;
};

export type SearchQueryRecord = {
    readonly claimId: string;
    readonly query: string;
};

export type AuthenticityReport = {
    readonly id: string;
    readonly scope: AnalysisScope;
    readonly url: string;
    readonly siteId: string;
    readonly title: string;
    readonly claims: readonly Claim[];
    readonly queries: readonly SearchQueryRecord[];
    readonly references: readonly SourceReference[];
    readonly assessments: readonly AuthenticityAssessment[];
    readonly t0Notes: readonly string[];
    readonly t1Notes: readonly string[];
    readonly limitations: string;
    readonly searchOnly: boolean;
    readonly createdAt: number;
    readonly advisoryOnly: true;
};

export type AnalysisPhase =
    | 'idle'
    | 'extracting'
    | 'searching'
    | 'fetching'
    | 'synthesizing'
    | 'complete'
    | 'error'
    | 'cancelled';

export type AuthenticityJobState = {
    readonly jobId: string;
    readonly phase: AnalysisPhase;
    readonly progress: number;
    readonly message: string;
    readonly report: AuthenticityReport | null;
    readonly error: string | null;
};
