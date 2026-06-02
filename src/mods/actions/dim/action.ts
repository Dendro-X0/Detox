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

export const DIM_ACTION_ID = 'dim';

export const dimAction: EnforcementAction = {
    id: DIM_ACTION_ID,
    displayName: 'Dim',
    apply(element, verdict, context) {
        const validationError = validateEnforcementTarget(element, context);
        if (validationError) return validationError;

        storeOriginalStyles(element);
        element.style.opacity = '0.35';
        element.style.filter = 'grayscale(40%)';
        element.style.transition = 'opacity 0.4s, filter 0.4s';
        element.title = formatFilteredTitle(verdict);
        markElementBlocked(element, DIM_ACTION_ID, context.blockId);
        storeVerdict(element, verdict);
        attachRevealHandler(element, () => dimAction.reveal(element));
        return { success: true };
    },
    reveal(element) {
        restoreOriginalStyles(element);
        clearBlockedState(element);
    },
};
