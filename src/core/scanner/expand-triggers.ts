/**
 * Selectors for user interactions that typically reveal hidden text (expand, load more).
 * Used by ScanCoordinator to schedule rescans after clicks.
 */
export const EXPAND_INTERACTION_SELECTOR = [
    '[aria-expanded="false"]',
    '[data-testid="comment-expand"]',
    '#expander',
    'faceplate-expander',
    'button[aria-label*="expand" i]',
    'button[aria-label*="more" i]',
    'button[aria-label*="reply" i]',
].join(', ');

export function isExpandInteractionTarget(target: EventTarget | null): boolean {
    if (!(target instanceof Element)) return false;
    return Boolean(target.closest(EXPAND_INTERACTION_SELECTOR));
}
