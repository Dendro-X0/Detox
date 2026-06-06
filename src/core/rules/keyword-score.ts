import { countKeywordHits, textMatchesKeyword, weightedKeywordHits } from './keyword-match';

/** Score from keyword hits — balanced (0.5) needs multi-hit, phrase + token, or weight ≥ 3. */
export function scoreFromKeywordWeight(weight: number, distinctHits = 1): number {
    if (weight <= 0) return 0;
    if (weight === 1) return 0.35;
    if (weight === 2 && distinctHits >= 2) return 0.52;
    if (weight === 2) return 0.48;
    return Math.min(1, 0.15 + weight * 0.2);
}

export function scoreFromKeywordHits(text: string, keywords: readonly string[]): number {
    const weight = weightedKeywordHits(text, keywords);
    const distinctHits = countKeywordHits(text, keywords);
    return scoreFromKeywordWeight(weight, distinctHits);
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

/** True when keyword weight crosses threshold, or short promo signal with a strong phrase hit. */
export function isKeywordScoreBlocked(
    text: string,
    keywords: readonly string[],
    threshold: number
): boolean {
    const weight = weightedKeywordHits(text, keywords);
    const score = scoreFromKeywordHits(text, keywords);
    if (score >= threshold) return true;
    const trimmed = text.trim();
    return hasShortTextSignal(trimmed) && trimmed.length < 24 && weight >= 2;
}
