/** Lightweight page snapshot for authenticity scope (no DOM handles). */
export type PageContextUnit = {
    readonly id: string;
    readonly text: string;
    readonly preview: string;
};

export type PageContext = {
    readonly url: string;
    readonly title: string;
    readonly siteId: string;
    readonly units: readonly PageContextUnit[];
    readonly mainText: string;
    readonly isDenseSite: boolean;
};

const MAIN_TEXT_JOIN = '\n\n';

/**
 * Builds article-style text from scanner units (longest-first, deduped).
 */
export function buildMainTextFromUnits(
    units: readonly PageContextUnit[],
    maxChars: number
): string {
    const seen = new Set<string>();
    const parts: string[] = [];

    const sorted = [...units].sort((a, b) => b.text.length - a.text.length);
    for (const unit of sorted) {
        const normalized = unit.text.trim();
        if (normalized.length < 40 || seen.has(normalized)) continue;
        seen.add(normalized);
        parts.push(normalized);
        const combined = parts.join(MAIN_TEXT_JOIN);
        if (combined.length >= maxChars) {
            return combined.slice(0, maxChars);
        }
    }

    return parts.join(MAIN_TEXT_JOIN).slice(0, maxChars);
}
