const CUSTOM_ELEMENT_PATTERN = /^[a-z]+-[a-z0-9-]+$/i;
const LEAF_CONTENT_TAGS = new Set(['p', 'span', 'blockquote', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

/**
 * Prefer a leaf text node for scanning markers and enforcement so we never
 * dim or tag layout containers (custom elements, feed rows, sidebars).
 */
export function resolveEnforcementTarget(element: HTMLElement): HTMLElement {
    if (isSafeLeafTarget(element)) return element;

    const inner = element.querySelector<HTMLElement>(
        '[slot="text-body"], [slot="comment"], .md, .usertext-body, p, blockquote'
    );
    if (inner && isSafeLeafTarget(inner)) return inner;

    if (isCustomElementHost(element)) {
        const paragraph = element.querySelector<HTMLElement>('p, blockquote, [role="paragraph"]');
        if (paragraph && isSafeLeafTarget(paragraph)) return paragraph;
    }

    return element;
}

export function isCustomElementHost(element: HTMLElement): boolean {
    return CUSTOM_ELEMENT_PATTERN.test(element.tagName);
}

export function isSafeLeafTarget(element: HTMLElement): boolean {
    const tag = element.tagName.toLowerCase();
    if (LEAF_CONTENT_TAGS.has(tag)) return true;
    if (isCustomElementHost(element)) return false;

    const text = element.textContent?.trim() ?? '';
    if (text.length > 900) return false;

    const rect = element.getBoundingClientRect();
    if (rect.width * rect.height > 180_000) return false;

    return tag === 'div' && text.length >= 50 && text.length <= 900;
}
