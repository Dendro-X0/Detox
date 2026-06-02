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

export const BLUR_ACTION_ID = 'blur';

export const blurAction: EnforcementAction = {
    id: BLUR_ACTION_ID,
    displayName: 'Blur',
    apply(element, verdict, context) {
        const validationError = validateEnforcementTarget(element, context);
        if (validationError) return validationError;

        storeOriginalStyles(element);
        element.style.filter = 'blur(10px) grayscale(100%)';
        element.style.transition = 'filter 0.5s';
        element.title = formatFilteredTitle(verdict);
        markElementBlocked(element, BLUR_ACTION_ID, context.blockId);
        storeVerdict(element, verdict);
        attachRevealHandler(element, () => blurAction.reveal(element));
        return { success: true };
    },
    reveal(element) {
        restoreOriginalStyles(element);
        clearBlockedState(element);
    },
};
