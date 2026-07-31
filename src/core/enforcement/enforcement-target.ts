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

const FRAME_MIN_AREA_PX = 2_500;
const FRAME_MAX_AREA_PX = 420_000;

function elementBox(element: HTMLElement): { readonly width: number; readonly height: number } {
    const rect = element.getBoundingClientRect();
    let width = rect.width;
    let height = rect.height;
    if (width <= 0) width = element.offsetWidth;
    if (height <= 0) height = element.offsetHeight;
    if (width <= 0 && element.style.width) width = parseFloat(element.style.width) || 0;
    if (height <= 0 && element.style.height) height = parseFloat(element.style.height) || 0;
    return { width, height };
}

function isReasonableVisualFrame(element: HTMLElement): boolean {
    const { width, height } = elementBox(element);
    const area = width * height;
    if (area < FRAME_MIN_AREA_PX || area > FRAME_MAX_AREA_PX) return false;
    if (width < 48 || height < 32) return false;
    return true;
}

/**
 * Prefer the scanner unit when it is a usable card/container; otherwise walk up from the
 * enforcement leaf to the nearest reasonably-sized ancestor tied to the scan unit.
 */
export function resolveVisualContainer(
    scanUnit: HTMLElement,
    enforcementTarget: HTMLElement
): HTMLElement {
    if (scanUnit === enforcementTarget) return scanUnit;

    if (scanUnit.contains(enforcementTarget) && isReasonableVisualFrame(scanUnit)) {
        return scanUnit;
    }

    let best = enforcementTarget;
    let node: HTMLElement | null = enforcementTarget.parentElement;
    const stopAt = scanUnit.parentElement;

    while (node && node !== stopAt) {
        const tiedToScanUnit = scanUnit.contains(node) || node.contains(scanUnit);
        if (tiedToScanUnit && isReasonableVisualFrame(node)) {
            best = node;
        }
        node = node.parentElement;
    }

    if (scanUnit.contains(best) || best.contains(scanUnit)) return best;
    return scanUnit.contains(enforcementTarget) ? scanUnit : enforcementTarget;
}

/** Apply dim/enforcement to the visual container when the scanner unit wraps a text leaf. */
export function pickEnforcementElement(
    scanUnit: HTMLElement,
    enforcementTarget: HTMLElement
): HTMLElement {
    const frame = resolveVisualContainer(scanUnit, enforcementTarget);
    if (frame === enforcementTarget) return enforcementTarget;
    if (!frame.contains(enforcementTarget)) return enforcementTarget;

    const text = frame.textContent?.trim() ?? '';
    if (text.length > 800) return enforcementTarget;

    const { width, height } = elementBox(frame);
    if (width * height > 900_000) return enforcementTarget;

    return frame;
}
