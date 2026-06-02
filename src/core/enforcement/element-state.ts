import type { EnforcementContext } from '../types/enforcement';
import type { EnforcementResult } from '../../site-adapters/adapter-interface';

export const ENFORCEMENT_DATASET = {
    blocked: 'detoxBlocked',
    verdict: 'detoxVerdict',
    blockId: 'detoxId',
    actionId: 'detoxActionId',
    originalStyles: 'detoxOriginalStyles',
} as const;

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
    element.title = '';
    element.onclick = null;
    delete element.dataset[ENFORCEMENT_DATASET.blocked];
    delete element.dataset[ENFORCEMENT_DATASET.verdict];
    delete element.dataset[ENFORCEMENT_DATASET.actionId];
}

export function attachRevealHandler(element: HTMLElement, reveal: () => void): void {
    element.style.cursor = 'pointer';
    element.onclick = (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        reveal();
    };
}

export function storeVerdict(element: HTMLElement, verdict: unknown): void {
    element.dataset[ENFORCEMENT_DATASET.verdict] = JSON.stringify(verdict);
}
