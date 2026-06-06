/**
 * Stable DOM anchor attributes used for fingerprint identity when structure churns.
 * Order matters: more specific site ids first.
 */
export const FINGERPRINT_ANCHOR_ATTRIBUTES = [
    'data-fixture-stable-id',
    'data-testid',
    'data-comment-id',
    'data-post-id',
    'data-thing-id',
    'data-fullname',
    'itemid',
    'name',
] as const;

const UNSTABLE_ID_PATTERN = /^(?:[a-f0-9-]{36}|ember\d+|react-aria-\d+|_:r[\da-z]+)$/i;

function isDocumentNode(node: ParentNode): node is Document {
    return 'nodeType' in node && node.nodeType === Node.DOCUMENT_NODE;
}

function isStableElementId(id: string): boolean {
    if (id.length < 2) return false;
    return !UNSTABLE_ID_PATTERN.test(id);
}

/**
 * Collects stable anchor tokens from element → root for fingerprint identity.
 * Returns null when no stable anchors are found (falls back to structural path).
 */
export function collectAnchorKey(element: HTMLElement, root: ParentNode): string | null {
    const tokens: string[] = [];
    let current: Element | null = element;

    while (current && current !== root) {
        if (isDocumentNode(root) && current === root.documentElement) break;

        let hasSemanticAnchor = false;
        for (const attribute of FINGERPRINT_ANCHOR_ATTRIBUTES) {
            const value = current.getAttribute(attribute)?.trim();
            if (value) {
                tokens.push(`${attribute}=${value}`);
                hasSemanticAnchor = true;
            }
        }

        if (hasSemanticAnchor) {
            const elementId = current.getAttribute('id')?.trim();
            if (elementId && isStableElementId(elementId)) {
                tokens.push(`id=${elementId}`);
            }
        }

        current = current.parentElement;
    }

    if (tokens.length === 0) return null;
    return [...new Set(tokens)].sort().join('|');
}
