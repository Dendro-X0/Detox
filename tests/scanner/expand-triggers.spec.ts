import { describe, expect, it } from 'vitest';
import { createScanCoordinator } from '../../src/core/scanner/scan-coordinator';
import { isExpandInteractionTarget } from '../../src/core/scanner/expand-triggers';
import { countMatchedUnits } from './acceptance-helpers';
import { loadAcceptanceFixture } from './load-acceptance-fixture';
import { scanUniversal } from '../../src/core/scanner/universal-scanner';

describe('expand triggers', () => {
    it('recognizes expand interaction targets', () => {
        const document = loadAcceptanceFixture('expand-reveal.html');
        const button = document.querySelector('#expander')!;
        expect(isExpandInteractionTarget(button)).toBe(true);
        expect(isExpandInteractionTarget(document.querySelector('main')!)).toBe(false);
    });

    it('rescans after expand click reveals hidden reply text', () => {
        const document = loadAcceptanceFixture('expand-reveal.html');
        const addedIds: string[] = [];

        const coordinator = createScanCoordinator(document, {
            onAdded: (units) => {
                for (const unit of units) {
                    addedIds.push(unit.id);
                }
            },
        }, { debounceMs: 10 });

        coordinator.start();
        expect(countMatchedUnits(document, scanUniversal(document), ['visible-comment'])).toBe(1);
        expect(countMatchedUnits(document, scanUniversal(document), ['revealed-reply'])).toBe(0);

        const button = document.querySelector('#expander') as HTMLButtonElement;
        const collapsed = document.querySelector('#collapsed-replies') as HTMLElement;
        const template = document.querySelector('#lazy-reply') as HTMLTemplateElement;
        button.click();
        button.setAttribute('aria-expanded', 'true');
        collapsed.append(...template.content.childNodes);

        coordinator.flush();

        expect(countMatchedUnits(document, scanUniversal(document), ['revealed-reply'])).toBe(1);
        expect(addedIds.length).toBeGreaterThanOrEqual(2);
        coordinator.stop();
    });
});
