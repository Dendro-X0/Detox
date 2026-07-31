import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyEnforcementToElement } from '../../src/core/enforcement/apply-enforcement';
import { applyUnitEnforcement } from '../../src/core/enforcement/apply-unit-enforcement';
import {
    attachFilteredAffordance,
    removeFilteredAffordance,
} from '../../src/core/enforcement/filtered-affordance';
import { ENFORCEMENT_DATASET } from '../../src/core/enforcement/element-state';
import { dimAction } from '../../src/mods/actions/dim/action';
import { registerEnforcementAction } from '../../src/core/registry/action-registry';
import type { Verdict } from '../../src/core/types/verdict';

vi.mock('../../src/i18n/runtime-locale', () => ({
    runtimeTranslate: vi.fn((key: string, values?: Readonly<Record<string, string | number>>) => {
        if (key === 'enforcement.clickToShow') return 'Click to show';
        if (key === 'enforcement.filteredBadgeWithReason' && values?.reason) {
            return `${values.reason} — click to show`;
        }
        if (key === 'enforcement.filteredBadge') return 'Filtered — click to show';
        if (key.startsWith('filterReasons.labels.')) {
            return key.replace('filterReasons.labels.', '');
        }
        return key;
    }),
}));

const MATCHED_VERDICT: Verdict = {
    matched: true,
    score: 0.92,
    labelId: 'clickbait',
    detectorId: 'heuristic-keywords',
};

function frameRect(): DOMRect | null {
    const frame = document.querySelector<HTMLElement>('.sl-filter-frame');
    if (!frame || frame.hidden) return null;
    return {
        top: parseFloat(frame.style.top),
        left: parseFloat(frame.style.left),
        width: parseFloat(frame.style.width),
        height: parseFloat(frame.style.height),
        bottom: 0,
        right: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
    } as DOMRect;
}

describe('filtered affordance frame', () => {
    beforeEach(() => {
        registerEnforcementAction(dimAction);
        document.body.innerHTML = '';
        document.documentElement.innerHTML = '<head></head><body></body>';
    });

    afterEach(() => {
        document.querySelectorAll('.sl-filter-frame, .sl-filter-badge').forEach((node) => node.remove());
        document.getElementById('sl-filter-affordance-styles')?.remove();
    });

    it('attaches a bordered frame with centered label when enforcement succeeds', () => {
        const element = document.createElement('p');
        element.textContent = 'You will not believe what happened next in this thread.';
        document.body.appendChild(element);

        const result = applyEnforcementToElement(element, MATCHED_VERDICT, { blockId: 'unit-1' });

        expect(result.success).toBe(true);
        expect(element.dataset[ENFORCEMENT_DATASET.blocked]).toBe('true');

        const frame = document.querySelector('.sl-filter-frame');
        expect(frame).not.toBeNull();
        expect(frame?.querySelector('.sl-filter-frame-reason')?.textContent).toContain('clickbait');
        expect(frame?.querySelector('.sl-filter-frame-hint')?.textContent).toBe('Click to show');
    });

    it('frames the scanner card container when enforcement promotes to the wrapper', () => {
        const card = document.createElement('article');
        card.style.width = '280px';
        card.style.height = '160px';
        card.style.display = 'block';

        const heading = document.createElement('h3');
        heading.textContent = 'Download the BBC app';
        const paragraph = document.createElement('p');
        paragraph.textContent =
            'Get the latest news and features direct to your device with the BBC app download today.';
        card.append(heading, paragraph);
        document.body.appendChild(card);

        const result = applyUnitEnforcement('unit-card', card, MATCHED_VERDICT);
        expect(result.success).toBe(true);
        expect(card.dataset[ENFORCEMENT_DATASET.blocked]).toBe('true');

        const overlay = frameRect();
        expect(overlay).not.toBeNull();
        expect(overlay!.width).toBeGreaterThan(200);
        expect(overlay!.height).toBeGreaterThan(120);
    });

    it('removes the frame when blocked state is cleared', () => {
        const element = document.createElement('p');
        element.textContent = 'Limited time offer — act now before this deal disappears forever.';
        document.body.appendChild(element);

        attachFilteredAffordance(element, MATCHED_VERDICT);
        expect(document.querySelectorAll('.sl-filter-frame')).toHaveLength(1);

        removeFilteredAffordance(element);
        expect(document.querySelectorAll('.sl-filter-frame')).toHaveLength(0);
    });

    it('reveals content when the centered label is clicked', () => {
        const element = document.createElement('p');
        element.textContent = 'Doctors hate this one weird trick for engagement bait headlines.';
        document.body.appendChild(element);

        applyEnforcementToElement(element, MATCHED_VERDICT, { blockId: 'unit-2' });
        const label = document.querySelector<HTMLButtonElement>('.sl-filter-frame-label');
        expect(label).not.toBeNull();

        label?.click();

        expect(element.dataset[ENFORCEMENT_DATASET.blocked]).toBeUndefined();
        expect(document.querySelectorAll('.sl-filter-frame')).toHaveLength(0);
    });
});
