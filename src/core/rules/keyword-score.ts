import { countKeywordHits, textMatchesKeyword, weightedKeywordHits } from './keyword-match';

/** Score from keyword hits — tuned for balanced threshold (0.5) to need phrase or multi-hit. */
export function scoreFromKeywordWeight(weight: number): number {
    if (weight <= 0) return 0;
    return Math.min(1, 0.15 + weight * 0.2);
}

export function scoreFromKeywordHits(text: string, keywords: readonly string[]): number {
    return scoreFromKeywordWeight(weightedKeywordHits(text, keywords));
}

export function verdictFromKeywords(
    text: string,
    threshold: number,
    keywords: readonly string[],
    detectorId: string,
    labelId: string
): { readonly matched: boolean; readonly score: number; readonly labelId: string; readonly detectorId: string } {
    const score = scoreFromKeywordHits(text, keywords);
    return {
        matched: score >= threshold,
        score,
        labelId,
        detectorId,
    };
}

/** High-confidence short promo/bait phrases — bypasses min-length gate when matched. */
export const SHORT_TEXT_SIGNAL_PHRASES: readonly string[] = [
    'buy now',
    'click here',
    'limited offer',
    'sponsored',
    'subscribe now',
    'use code',
    'promo code',
    'link in bio',
    "you won't believe",
    'you wont believe',
];

export function hasShortTextSignal(text: string): boolean {
    return countKeywordHits(text, SHORT_TEXT_SIGNAL_PHRASES) > 0;
}

export function textMatchesAnyKeyword(text: string, keywords: readonly string[]): boolean {
    return keywords.some((keyword) => textMatchesKeyword(text, keyword));
}
