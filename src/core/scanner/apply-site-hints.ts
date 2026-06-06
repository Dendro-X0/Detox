import { hasSubstantiveText, isChromeElement, normalizeText } from './filters';
import type { SiteScanHints } from './site-hints';

const BOOST_INNER_SELECTORS = 'p, blockquote, li, [slot="text"], #content-text, #expander';

function matchesSelector(element: Element, selector: string): boolean {
    try {
        return element.matches(selector);
    } catch {
        return false;
    }
}

function closestSelector(element: Element, selector: string): Element | null {
    try {
        return element.closest(selector);
    } catch {
        return null;
    }
}

export function isExcludedByHints(element: HTMLElement, hints?: SiteScanHints | null): boolean {
    if (isChromeElement(element)) return true;
    if (!hints?.ignoreSelectors?.length) return false;

    for (const selector of hints.ignoreSelectors) {
        if (matchesSelector(element, selector) || closestSelector(element, selector)) {
            return true;
        }
    }
    return false;
}

export function collectBoostCandidates(root: ParentNode, hints?: SiteScanHints | null): HTMLElement[] {
    if (!hints?.boostSelectors?.length) return [];

    const candidates: HTMLElement[] = [];
    const ownerDocument = root instanceof Document ? root : root.ownerDocument;
    if (!ownerDocument) return [];

    for (const selector of hints.boostSelectors) {
        for (const host of ownerDocument.querySelectorAll(selector)) {
            if (!(host instanceof HTMLElement)) continue;
            if (isExcludedByHints(host, hints)) continue;

            const innerMatches = host.querySelectorAll<HTMLElement>(BOOST_INNER_SELECTORS);
            if (innerMatches.length > 0) {
                for (const inner of innerMatches) {
                    if (isExcludedByHints(inner, hints)) continue;
                    const text = normalizeText(inner.textContent ?? '');
                    if (!hasSubstantiveText(text)) continue;
                    candidates.push(inner);
                }
                continue;
            }

            const text = normalizeText(host.textContent ?? '');
            if (hasSubstantiveText(text)) {
                candidates.push(host);
            }
        }
    }

    return candidates;
}
