import { describe, expect, it } from 'vitest';
import {
    DEFAULT_FILTER_APPEARANCE,
    FILTER_APPEARANCE_PRESETS,
    normalizeFilterAppearance,
    resolveFilterAppearance,
} from '../../src/core/types/filter-appearance';

describe('filter appearance settings', () => {
    it('normalizes out-of-range values', () => {
        const normalized = normalizeFilterAppearance({
            presetId: 'custom',
            contentOpacity: 0.05,
            grayscalePercent: 200,
            blurPx: 99,
            frameBorderOpacity: 2,
            frameFillOpacity: 1,
            frameBorderWidthPx: 9,
        });
        expect(normalized.contentOpacity).toBe(0.12);
        expect(normalized.grayscalePercent).toBe(100);
        expect(normalized.blurPx).toBe(20);
        expect(normalized.frameBorderOpacity).toBe(1);
        expect(normalized.frameFillOpacity).toBe(0.45);
        expect(normalized.frameBorderWidthPx).toBe(4);
    });

    it('resolves preset values without custom overrides', () => {
        const resolved = resolveFilterAppearance({
            ...DEFAULT_FILTER_APPEARANCE,
            presetId: 'strong',
            contentOpacity: 0.9,
        });
        expect(resolved.contentOpacity).toBe(FILTER_APPEARANCE_PRESETS.strong.contentOpacity);
        expect(resolved.grayscalePercent).toBe(FILTER_APPEARANCE_PRESETS.strong.grayscalePercent);
    });

    it('uses custom values when preset is custom', () => {
        const resolved = resolveFilterAppearance({
            presetId: 'custom',
            contentOpacity: 0.5,
            grayscalePercent: 10,
            blurPx: 4,
            frameBorderOpacity: 0.4,
            frameFillOpacity: 0.05,
            frameBorderWidthPx: 1,
            showRevealHint: false,
        });
        expect(resolved.contentOpacity).toBe(0.5);
        expect(resolved.showRevealHint).toBe(false);
    });
});
