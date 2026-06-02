/**
 * Marks items whose score sits near the policy threshold — candidates for API escalation.
 */
export function isUncertainScore(score: number, threshold: number, margin: number): boolean {
    const safeMargin = Math.max(0, Math.min(margin, 0.49));
    return score >= threshold - safeMargin && score <= threshold + safeMargin;
}
