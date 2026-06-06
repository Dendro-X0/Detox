/** Escape special regex characters in a literal keyword. */
function escapeRegexLiteral(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Match a block keyword against text. Short tokens use word boundaries to reduce false positives;
 * phrases and longer tokens use substring match.
 */
export function textMatchesKeyword(text: string, keyword: string): boolean {
    const normalized = text.toLowerCase();
    const term = keyword.trim().toLowerCase();
    if (!term) return false;

    if (term.includes(' ')) {
        return normalized.includes(term);
    }

    if (term.length > 4) {
        return normalized.includes(term);
    }

    const pattern = new RegExp(`\\b${escapeRegexLiteral(term)}\\b`, 'i');
    return pattern.test(text);
}

/** Phrases count double — reduces false positives from a lone weak token at balanced threshold. */
export function weightedKeywordHits(text: string, keywords: readonly string[]): number {
    let weight = 0;
    for (const keyword of keywords) {
        if (!textMatchesKeyword(text, keyword)) continue;
        const term = keyword.trim();
        weight += term.includes(' ') || term.length > 10 ? 2 : 1;
    }
    return weight;
}

export function countKeywordHits(text: string, keywords: readonly string[]): number {
    let hits = 0;
    for (const keyword of keywords) {
        if (textMatchesKeyword(text, keyword)) hits += 1;
    }
    return hits;
}
