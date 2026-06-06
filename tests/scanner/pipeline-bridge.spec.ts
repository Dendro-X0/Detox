import { describe, expect, it } from 'vitest';
import type { ContentUnit } from '../../src/core/scanner/content-unit';
import { ScanWorkRegistry } from '../../src/core/pipeline/scan-work-registry';

describe('S3 — pipeline units', () => {
    it('registers content units in the scan work registry', () => {
        const element = document.createElement('p');
        element.textContent = 'Sample paragraph text for unit registration.';

        const units: ContentUnit[] = [
            { id: 'unit-p:1-abc', text: element.textContent, element },
        ];

        const registry = new ScanWorkRegistry();
        const added = registry.addUnits(units, () => true);

        expect(added).toBe(1);
        expect(registry.pendingCount()).toBe(1);
        expect(registry.takeBatch(4)[0]?.unit.id).toBe('unit-p:1-abc');
    });
});
