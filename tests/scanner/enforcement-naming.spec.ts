import { describe, expect, it } from 'vitest';
import { ENFORCEMENT_DATASET, enforcementAttrSelector } from '../../src/core/enforcement/element-state';
import { CONTENT_PERF_REQUEST, CONTENT_PERF_RESPONSE } from '../../src/core/ipc/content-messages';
import { OFFSCREEN_PORT_NAME, OFFSCREEN_REQUEST_ID_PREFIX } from '../../src/core/runtime/constants';

describe('8.5 — neutral naming', () => {
    it('maps enforcement dataset keys to data-sl attribute selectors', () => {
        expect(enforcementAttrSelector('blocked', 'true')).toBe('[data-sl-blocked="true"]');
        expect(enforcementAttrSelector('blockId', 'unit-abc')).toBe('[data-sl-id="unit-abc"]');
        expect(enforcementAttrSelector('userRevealed')).toBe('[data-sl-user-revealed]');
    });

    it('uses sl-prefixed dataset property names', () => {
        const element = document.createElement('p');
        element.dataset[ENFORCEMENT_DATASET.blockId] = 'unit-1';
        element.dataset[ENFORCEMENT_DATASET.blocked] = 'true';

        expect(element.getAttribute('data-sl-id')).toBe('unit-1');
        expect(element.getAttribute('data-sl-blocked')).toBe('true');
    });

    it('exports neutral runtime and IPC constants', () => {
        expect(OFFSCREEN_PORT_NAME).toBe('signallens-offscreen');
        expect(OFFSCREEN_REQUEST_ID_PREFIX).toBe('signallens-req-');
        expect(CONTENT_PERF_REQUEST).toBe('slGetPerfMetrics');
        expect(CONTENT_PERF_RESPONSE).toBe('slPerfResponse');
    });
});
