import { describe, expect, it } from 'vitest';
import { mergeClassifyResults } from '../../src/core/runtime/merge-classify-results';
import { classifyNoisePatterns } from '../../src/mods/detectors/noise-patterns/patterns';

describe('11 — noise pattern detector', () => {
    it('classifyNoisePatterns matches engagement bait phrasing', () => {
        const verdict = classifyNoisePatterns(
            'You will not believe what happens next in this shocking story.',
            0.5
        );
        expect(verdict.matched).toBe(true);
        expect(verdict.labelId).toBe('engagement-bait');
    });

    it('classifyNoisePatterns matches promo keywords', () => {
        const verdict = classifyNoisePatterns('Limited offer — buy now before it ends.', 0.5);
        expect(verdict.matched).toBe(true);
        expect(verdict.labelId).toBe('promo');
    });

    it('mergeClassifyResults OR-merges supplemental matches', () => {
        const primary = [
            { id: 'a', matched: false, score: 0.1, labelId: 'noise', detectorId: 'heuristic-keywords' },
        ];
        const supplemental = [
            { id: 'a', matched: true, score: 0.8, labelId: 'promo', detectorId: 'noise-patterns' },
        ];
        const merged = mergeClassifyResults(primary, supplemental);
        expect(merged[0]?.matched).toBe(true);
        expect(merged[0]?.labelId).toBe('promo');
        expect(merged[0]?.score).toBe(0.8);
    });
});
