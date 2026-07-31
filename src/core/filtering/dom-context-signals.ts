/** DOM context signals — language-agnostic structural hints from markup. */

import { getMergedAdaptationRules } from '../adaptation/adaptation-pack-registry';

export type DomContextSignals = {
    readonly promoted: boolean;
    readonly adLike: boolean;
};

const PROMOTED_RE = /(?:sponsor|promoted|advert|native-ad|paid-partner|brand-content)/i;
const AD_SLOT_RE = /(?:^|\s)(?:ad|ads|advert|advertisement|dfp|gpt-ad)(?:\s|$|[-_])/i;

function elementHints(el: Element, extraMarkers: readonly string[]): { promoted: boolean; adLike: boolean } {
    const id = el.id ?? '';
    const className = typeof el.className === 'string' ? el.className : '';
    const attrs = `${id} ${className} ${el.getAttribute('data-ad') ?? ''} ${el.getAttribute('data-ad-slot') ?? ''} ${el.getAttribute('data-advertisement') ?? ''} ${el.getAttribute('aria-label') ?? ''}`;
    const haystack = attrs.toLowerCase();

    const promoted = PROMOTED_RE.test(haystack) || extraMarkers.some((m) => haystack.includes(m.toLowerCase()));
    const adLike =
        promoted ||
        AD_SLOT_RE.test(haystack) ||
        el.hasAttribute('data-ad') ||
        el.hasAttribute('data-ad-slot') ||
        el.getAttribute('role') === 'complementary' && PROMOTED_RE.test(haystack);

    return { promoted, adLike };
}

/** Walk element + ancestors (max depth) for sponsorship / ad-slot markers. */
export function extractDomContextSignals(element: HTMLElement, maxDepth = 5): DomContextSignals {
    const merged = getMergedAdaptationRules();
    const extraMarkers = merged.domPromotedMarkers;

    let promoted = false;
    let adLike = false;
    let current: Element | null = element;

    for (let depth = 0; current && depth <= maxDepth; depth += 1) {
        const hints = elementHints(current, extraMarkers);
        promoted = promoted || hints.promoted;
        adLike = adLike || hints.adLike;
        current = current.parentElement;
    }

    return { promoted, adLike };
}

/** Convert DOM hints to a score boost for behavior classifier (0–0.25). */
export function domContextBoost(signals: DomContextSignals): number {
    if (signals.promoted) return 0.25;
    if (signals.adLike) return 0.15;
    return 0;
}
