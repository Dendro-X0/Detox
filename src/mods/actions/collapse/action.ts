import type { EnforcementAction } from '../../../core/types/enforcement';
import {
    attachRevealHandler,
    clearBlockedState,
    markElementBlocked,
    restoreOriginalStyles,
    storeOriginalStyles,
    storeVerdict,
    validateEnforcementTarget,
} from '../../../core/enforcement/element-state';
import { formatFilteredTitle } from '../../../core/enforcement/format-filtered-title';

export const COLLAPSE_ACTION_ID = 'collapse';

export const collapseAction: EnforcementAction = {
    id: COLLAPSE_ACTION_ID,
    displayName: 'Collapse',
    apply(element, verdict, context) {
        const validationError = validateEnforcementTarget(element, context);
        if (validationError) return validationError;

        storeOriginalStyles(element);
        element.style.maxHeight = '1.6em';
        element.style.overflow = 'hidden';
        element.style.opacity = '0.55';
        element.style.transition = 'max-height 0.4s, opacity 0.4s';
        element.title = formatFilteredTitle(verdict);
        markElementBlocked(element, COLLAPSE_ACTION_ID, context.blockId);
        storeVerdict(element, verdict);
        attachRevealHandler(element, () => collapseAction.reveal(element));
        return { success: true };
    },
    reveal(element) {
        restoreOriginalStyles(element);
        clearBlockedState(element);
    },
};
