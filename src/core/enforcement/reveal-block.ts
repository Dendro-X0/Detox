import { ENFORCEMENT_DATASET, enforcementAttrSelector } from './element-state';
import { revealEnforcementElement } from './apply-enforcement';

export function revealBlockedContent(blockId: string, element?: HTMLElement | null): void {
    if (element) {
        revealEnforcementElement(element);
        return;
    }

    const byBlockId = document.querySelector<HTMLElement>(enforcementAttrSelector('blockId', blockId));
    if (byBlockId) {
        revealEnforcementElement(byBlockId);
        return;
    }

    for (const el of document.querySelectorAll<HTMLElement>(enforcementAttrSelector('blocked', 'true'))) {
        if (el.dataset[ENFORCEMENT_DATASET.blockId] === blockId) {
            revealEnforcementElement(el);
            return;
        }
    }
}
