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
import { getResolvedFilterAppearance } from '../../../core/settings/filter-appearance-store';
import { formatFilteredTitle } from '../../../core/enforcement/format-filtered-title';

export const BLUR_ACTION_ID = 'blur';

export const blurAction: EnforcementAction = {
    id: BLUR_ACTION_ID,
    displayName: 'Blur',
    apply(element, verdict, context) {
        const validationError = validateEnforcementTarget(element, context);
        if (validationError) return validationError;

        const appearance = getResolvedFilterAppearance();
        storeOriginalStyles(element);
        element.style.filter = `blur(${appearance.blurPx}px) grayscale(${appearance.grayscalePercent}%)`;
        element.style.opacity = String(appearance.contentOpacity);
        element.style.transition = 'opacity 0.4s, filter 0.5s';
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
