import { fnv1a32 } from '../pipeline/text-gate';
import type { ContentUnit } from './content-unit';
import { collectAnchorKey } from './anchor-attributes';

function isShadowRootNode(node: Node): node is ShadowRoot {
    return node.nodeType === Node.DOCUMENT_FRAGMENT_NODE && 'host' in node;
}

function isDocumentNode(node: ParentNode): node is Document {
    return 'nodeType' in node && node.nodeType === Node.DOCUMENT_NODE;
}

export function structuralPath(element: HTMLElement, root: ParentNode): string {
    const segments: string[] = [];
    let current: Element | null = element;

    while (current && current !== root) {
        const parent: Node | null = current.parentNode;
        if (!parent) break;

        if (isShadowRootNode(parent)) {
            segments.unshift('shadow');
            current = parent.host;
            continue;
        }

        if (!(parent instanceof Element)) break;

        const tag = current.tagName.toLowerCase();
        const siblings = [...parent.children].filter((child) => child.tagName === current!.tagName);
        const index = siblings.indexOf(current) + 1;
        segments.unshift(`${tag}:${index}`);
        current = parent;

        if (current === root || (isDocumentNode(root) && current === root.documentElement)) {
            break;
        }
    }

    return segments.join('/') || 'root';
}

export function fingerprintElement(element: HTMLElement, root: ParentNode, text: string): string {
    const hash = fnv1a32(text.slice(0, 240));
    const anchorKey = collectAnchorKey(element, root);
    if (anchorKey) {
        return `unit@${fnv1a32(anchorKey)}-${hash}`;
    }
    const path = structuralPath(element, root);
    return `unit-${path}-${hash}`;
}

export function fingerprintUnit(unit: ContentUnit, root: ParentNode): string {
    return fingerprintElement(unit.element, root, unit.text);
}
