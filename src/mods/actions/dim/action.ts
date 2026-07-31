import type { EnforcementAction } from '../../../core/types/enforcement';
import {
    attachRevealHandler,
    clearBlockedState,
    ENFORCEMENT_DATASET,
    markElementBlocked,
    restoreOriginalStyles,
    storeOriginalStyles,
    storeVerdict,
    validateEnforcementTarget,
} from '../../../core/enforcement/element-state';
import { getResolvedFilterAppearance } from '../../../core/settings/filter-appearance-store';
import { formatFilteredTitle } from '../../../core/enforcement/format-filtered-title';

export const DIM_ACTION_ID = 'dim';

export const dimAction: EnforcementAction = {
    id: DIM_ACTION_ID,
    displayName: 'Dim',
    apply(element, verdict, context) {
        if (element.dataset[ENFORCEMENT_DATASET.userRevealed] === 'true') {
            return { success: true };
        }

        const validationError = validateEnforcementTarget(element, context);
        if (validationError) return validationError;

        const appearance = getResolvedFilterAppearance();
        storeOriginalStyles(element);
        element.style.opacity = String(appearance.contentOpacity);
        element.style.filter = `grayscale(${appearance.grayscalePercent}%)`;
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
