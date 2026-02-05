export interface ScannedText {
    id: string;
    content: string;
}

/**
 * A non-recursive DOM walker that can pierce Shadow DOM.
 * Replaces the Rust/WASM version for better compatibility and performance.
 */
export function scanDocument(rootNode: Node): ScannedText[] {
    const results: ScannedText[] = [];
    const queue: Node[] = [rootNode];
    let counter = 0;

    // Faster lookup with Set
    const blacklist = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'SVG', 'CANVAS', 'PRE', 'CODE']);

    while (queue.length > 0) {
        const node = queue.shift()!;

        // 1. Process Text nodes
        if (node.nodeType === Node.TEXT_NODE) {
            const content = node.textContent?.trim();
            if (content && content.length > 3) { // Ignore very short snippets
                const parent = node.parentElement;
                if (parent) {
                    if (blacklist.has(parent.tagName.toUpperCase())) continue;
                    let id = parent.getAttribute('data-scnr-id');
                    if (!id) {
                        counter++;
                        id = `scnr-${counter}`;
                        parent.setAttribute('data-scnr-id', id);
                    }
                    results.push({ id, content });
                }
            }
            continue;
        }

        // 2. Filter elements
        if (node instanceof Element) {
            if (blacklist.has(node.tagName.toUpperCase())) {
                continue;
            }

            // 3. Pierce Shadow DOM
            if (node.shadowRoot) {
                queue.push(node.shadowRoot);
            }
        }

        // 4. Add child nodes
        const children = node.childNodes;
        for (let i = 0; i < children.length; i++) {
            queue.push(children[i]);
        }
    }

    return results;
}
