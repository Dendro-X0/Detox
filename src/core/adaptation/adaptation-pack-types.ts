import type { BehaviorSignalId } from '../filtering/content-behavior-signals';

export const ADAPTATION_PACK_FORMAT = 'signallens-adaptation/1' as const;

/** How adaptation pack data may be used — filtering only, never uploaded. */
export type AdaptationPackPrivacy = {
    readonly networkAccess: false;
    readonly persistsPageContent: false;
    readonly telemetry: false;
};

export type AdaptationPackCategory = 'language' | 'context' | 'site';

/** What kind of harmful or noisy content a pack targets (filter taxonomy). */
export type AdaptationContentType = 'promotional' | 'clickbait' | 'phishing' | 'toxic';

export const ADAPTATION_CONTENT_TYPES: readonly AdaptationContentType[] = [
    'promotional',
    'clickbait',
    'phishing',
    'toxic',
] as const;

export type AdaptationPackRules = {
    readonly format: typeof ADAPTATION_PACK_FORMAT;
    readonly packId: string;
    readonly version: string;
    readonly languages?: readonly string[];
    readonly contexts?: readonly string[];
    readonly contentTypes?: readonly AdaptationContentType[];
    readonly privacy: AdaptationPackPrivacy;
    readonly supplementalKeywords?: readonly string[];
    readonly noisePatterns?: Partial<
        Record<'promo' | 'outrage' | 'engagement-bait', readonly string[]>
    >;
    readonly behaviorWeightBoosts?: Partial<Record<BehaviorSignalId, number>>;
    readonly domPromotedMarkers?: readonly string[];
};

export type MergedAdaptationRules = {
    readonly supplementalKeywords: readonly string[];
    readonly noisePatterns: Partial<
        Record<'promo' | 'outrage' | 'engagement-bait', readonly string[]>
    >;
    readonly behaviorWeightBoosts: Partial<Record<BehaviorSignalId, number>>;
    readonly domPromotedMarkers: readonly string[];
    readonly activePackIds: readonly string[];
};

export function emptyMergedAdaptationRules(): MergedAdaptationRules {
    return {
        supplementalKeywords: [],
        noisePatterns: {},
        behaviorWeightBoosts: {},
        domPromotedMarkers: [],
        activePackIds: [],
    };
}

export function parseAdaptationPackRules(raw: unknown): AdaptationPackRules | null {
    if (typeof raw !== 'object' || raw === null) return null;
    const record = raw as Record<string, unknown>;
    if (record.format !== ADAPTATION_PACK_FORMAT || typeof record.packId !== 'string') return null;
    if (typeof record.version !== 'string') return null;
    const privacy = record.privacy as AdaptationPackPrivacy | undefined;
    if (
        !privacy ||
        privacy.networkAccess !== false ||
        privacy.persistsPageContent !== false ||
        privacy.telemetry !== false
    ) {
        return null;
    }
    return raw as AdaptationPackRules;
}
