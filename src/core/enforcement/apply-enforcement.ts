import type { Verdict } from '../types/verdict';
import type { EnforcementContext } from '../types/enforcement';
import { DEFAULT_ENFORCEMENT_CONTEXT } from '../types/enforcement';
import type { EnforcementResult } from '../../site-adapters/adapter-interface';
import {
    getActiveEnforcementAction,
    getEnforcementAction,
} from '../registry/action-registry';
import { ENFORCEMENT_DATASET, clearBlockedState, restoreOriginalStyles } from './element-state';

/**
 * Apply the active enforcement action mod to a DOM element.
 */
export function applyEnforcementToElement(
    element: HTMLElement,
    verdict: Verdict,
    context: Partial<EnforcementContext> = {}
): EnforcementResult {
    if (!verdict.matched) {
        return { success: true };
    }

    const mergedContext: EnforcementContext = { ...DEFAULT_ENFORCEMENT_CONTEXT, ...context };
    const action = getActiveEnforcementAction();
    return action.apply(element, verdict, mergedContext);
}

/**
 * Reveal a previously filtered element, using the action that originally filtered it.
 */
export function revealEnforcementElement(element: HTMLElement): void {
    const actionId = element.dataset[ENFORCEMENT_DATASET.actionId];
    const action = actionId ? getEnforcementAction(actionId) : getActiveEnforcementAction();
    if (action) {
        action.reveal(element);
        return;
    }

    restoreOriginalStyles(element);
    clearBlockedState(element);
}
