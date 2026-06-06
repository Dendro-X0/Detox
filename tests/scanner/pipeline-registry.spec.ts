import { describe, expect, it } from 'vitest';
import { ScanWorkRegistry } from '../../src/core/pipeline/scan-work-registry';
import type { ContentUnit } from '../../src/core/scanner/content-unit';

function makeUnit(id: string, text: string, top = 0): ContentUnit {
    const element = document.createElement('p');
    element.textContent = text;
    element.getBoundingClientRect = () => ({
        top,
        bottom: top + 40,
        left: 0,
        right: 100,
        width: 100,
        height: 40,
        x: 0,
        y: top,
        toJSON: () => ({}),
    });
    return { id, text, element };
}

describe('8.4 — pipeline registry', () => {
    it('dedupes units by id on addUnits', () => {
        const registry = new ScanWorkRegistry();
        const unit = makeUnit('u-1', 'First unit with enough words for registry dedupe testing.');

        expect(registry.addUnits([unit], () => true)).toBe(1);
        expect(registry.addUnits([unit], () => true)).toBe(0);
        expect(registry.totalCount()).toBe(1);
    });

    it('prioritizes visible units in takeBatch', () => {
        const registry = new ScanWorkRegistry();
        const hidden = makeUnit('hidden', 'Hidden unit with enough words for visibility priority batch ordering.', 5000);
        const visible = makeUnit('visible', 'Visible unit with enough words for visibility priority batch ordering.', 10);

        registry.addUnits([hidden, visible], (unit) => unit.id === 'visible');
        const batch = registry.takeBatch(2);

        expect(batch[0]?.id).toBe('visible');
        expect(batch[1]?.id).toBe('hidden');
    });

    it('markDone removes items from pending queue', () => {
        const registry = new ScanWorkRegistry();
        const unit = makeUnit('u-done', 'Pending unit with enough words for markDone registry coverage.');

        registry.addUnits([unit], () => true);
        expect(registry.pendingCount()).toBe(1);

        const batch = registry.takeBatch(1);
        registry.markDone(batch.map((item) => item.id));

        expect(registry.pendingCount()).toBe(0);
        expect(registry.doneCount()).toBe(1);
    });

    it('remove drops pending units without affecting done items', () => {
        const registry = new ScanWorkRegistry();
        const keep = makeUnit('keep', 'Kept unit with enough words for remove pending registry coverage.');
        const drop = makeUnit('drop', 'Dropped unit with enough words for remove pending registry coverage.');

        registry.addUnits([keep, drop], () => true);
        const batch = registry.takeBatch(1);
        registry.markDone([batch[0]!.id]);

        registry.remove(['drop']);
        expect(registry.pendingCount()).toBe(0);
        expect(registry.doneCount()).toBe(1);
        expect(registry.totalCount()).toBe(1);
    });
});
