import type { EnforcementContext } from '../types/enforcement';
import { removeFilteredAffordance } from './filtered-affordance';
import type { EnforcementResult } from './enforcement-result';

export const ENFORCEMENT_DATASET = {
    blocked: 'slBlocked',
    verdict: 'slVerdict',
    blockId: 'slId',
    actionId: 'slActionId',
    originalStyles: 'slOriginalStyles',
    userRevealed: 'slUserRevealed',
} as const;

export type EnforcementDatasetKey = keyof typeof ENFORCEMENT_DATASET;

/** Build a `[data-sl-…]` selector for a dataset key (optional attribute value). */
export function enforcementAttrSelector(key: EnforcementDatasetKey, value?: string): string {
    const kebab = ENFORCEMENT_DATASET[key].replace(/([A-Z])/g, '-$1').toLowerCase();
    const attr = `data-${kebab}`;
    return value === undefined ? `[${attr}]` : `[${attr}="${value}"]`;
}

const revealHandlerByElement = new WeakMap<HTMLElement, (ev: MouseEvent) => void>();

type StoredStyles = {
    readonly filter: string;
    readonly opacity: string;
    readonly maxHeight: string;
    readonly overflow: string;
    readonly cursor: string;
    readonly transition: string;
    readonly display: string;
};

export function validateEnforcementTarget(
    element: HTMLElement,
    context: EnforcementContext
): EnforcementResult | null {
    const text = element.textContent?.trim() ?? '';
    if (text.length > context.maxTextLength) {
        return { success: false, error: 'Element too large' };
    }

    const rect = element.getBoundingClientRect();
    const area = rect.width * rect.height;
    if (area > context.maxAreaPx) {
        return { success: false, error: 'Element area too large' };
    }

    return null;
}

export function storeOriginalStyles(element: HTMLElement): void {
    if (element.dataset[ENFORCEMENT_DATASET.originalStyles]) return;
    const styles: StoredStyles = {
        filter: element.style.filter,
        opacity: element.style.opacity,
        maxHeight: element.style.maxHeight,
        overflow: element.style.overflow,
        cursor: element.style.cursor,
        transition: element.style.transition,
        display: element.style.display,
    };
    element.dataset[ENFORCEMENT_DATASET.originalStyles] = JSON.stringify(styles);
}

export function restoreOriginalStyles(element: HTMLElement): void {
    const raw = element.dataset[ENFORCEMENT_DATASET.originalStyles];
    if (raw) {
        try {
            const styles = JSON.parse(raw) as StoredStyles;
            element.style.filter = styles.filter;
            element.style.opacity = styles.opacity;
            element.style.maxHeight = styles.maxHeight;
            element.style.overflow = styles.overflow;
            element.style.cursor = styles.cursor;
            element.style.transition = styles.transition;
            element.style.display = styles.display;
        } catch {
            clearInlineEnforcementStyles(element);
        }
        delete element.dataset[ENFORCEMENT_DATASET.originalStyles];
    } else {
        clearInlineEnforcementStyles(element);
    }
}

export function clearInlineEnforcementStyles(element: HTMLElement): void {
    element.style.filter = '';
    element.style.opacity = '';
    element.style.maxHeight = '';
    element.style.overflow = '';
    element.style.cursor = '';
    element.style.transition = '';
    element.style.display = '';
}

export function markElementBlocked(element: HTMLElement, actionId: string, blockId?: string): void {
    element.dataset[ENFORCEMENT_DATASET.blocked] = 'true';
    element.dataset[ENFORCEMENT_DATASET.actionId] = actionId;
    if (blockId) {
        element.dataset[ENFORCEMENT_DATASET.blockId] = blockId;
    }
}

export function clearBlockedState(element: HTMLElement): void {
    removeFilteredAffordance(element);
    element.title = '';
    const handler = revealHandlerByElement.get(element);
    if (handler) {
        element.removeEventListener('click', handler, true);
        revealHandlerByElement.delete(element);
    }
    element.onclick = null;
    delete element.dataset[ENFORCEMENT_DATASET.blocked];
    delete element.dataset[ENFORCEMENT_DATASET.verdict];
    delete element.dataset[ENFORCEMENT_DATASET.actionId];
}

export function markElementUserRevealed(element: HTMLElement): void {
    element.dataset[ENFORCEMENT_DATASET.userRevealed] = 'true';
}

export function attachRevealHandler(element: HTMLElement, reveal: () => void): void {
    element.style.cursor = 'pointer';
    const existing = revealHandlerByElement.get(element);
    if (existing) {
        element.removeEventListener('click', existing, true);
    }
    const handler = (ev: MouseEvent): void => {
        ev.preventDefault();
        ev.stopPropagation();
        markElementUserRevealed(element);
        reveal();
    };
    revealHandlerByElement.set(element, handler);
    element.addEventListener('click', handler, true);
}

export function storeVerdict(element: HTMLElement, verdict: unknown): void {
    element.dataset[ENFORCEMENT_DATASET.verdict] = JSON.stringify(verdict);
}
