/** Optional per-site tuning for the universal scanner (precision, not correctness). */
export type SiteScanHints = {
    /** Skip elements matching these selectors (element or ancestor). */
    readonly ignoreSelectors?: readonly string[];
    /** Prefer scanning inside these hosts (e.g. comment shells). */
    readonly boostSelectors?: readonly string[];
};

export type SiteHintPack = {
    readonly id: string;
    /** Plugin library mod that enables this pack (e.g. `adapter-reddit`). */
    readonly modId: string;
    readonly hostPattern: RegExp;
    readonly hints: SiteScanHints;
};

export const EMPTY_SITE_HINTS: SiteScanHints = {
    ignoreSelectors: [],
    boostSelectors: [],
};

export function mergeSiteHints(packs: readonly SiteScanHints[]): SiteScanHints {
    const ignoreSelectors: string[] = [];
    const boostSelectors: string[] = [];
    for (const pack of packs) {
        if (pack.ignoreSelectors) ignoreSelectors.push(...pack.ignoreSelectors);
        if (pack.boostSelectors) boostSelectors.push(...pack.boostSelectors);
    }
    return {
        ignoreSelectors,
        boostSelectors,
    };
}

export function hasActiveHints(hints: SiteScanHints | null | undefined): hints is SiteScanHints {
    if (!hints) return false;
    return (hints.ignoreSelectors?.length ?? 0) > 0 || (hints.boostSelectors?.length ?? 0) > 0;
}
