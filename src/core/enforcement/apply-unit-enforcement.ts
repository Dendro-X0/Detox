import type { Verdict } from '../types/verdict';
import { applyEnforcementToElement } from './apply-enforcement';
import { pickEnforcementElement, resolveEnforcementTarget } from './enforcement-target';
import { ENFORCEMENT_DATASET } from './element-state';
import type { EnforcementResult } from './enforcement-result';
import { revealBlockedContent } from './reveal-block';

/** Apply the active enforcement action to a discovered content unit. */
export function applyUnitEnforcement(
    unitId: string,
    element: HTMLElement,
    verdict: Verdict
): EnforcementResult {
    const leafTarget = resolveEnforcementTarget(element);
    const target = pickEnforcementElement(element, leafTarget);
    if (target.dataset[ENFORCEMENT_DATASET.userRevealed] === 'true') {
        return { success: true };
    }
    return applyEnforcementToElement(target, verdict, { blockId: unitId });
}

/** Reveal a previously filtered content unit. */
export function revealContentUnit(unitId: string, element?: HTMLElement | null): void {
    revealBlockedContent(unitId, element ?? null);
}
