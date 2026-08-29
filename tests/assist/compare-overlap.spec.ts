import { describe, expect, it } from 'vitest';
import { analyzeSnippetOverlap, formatOverlapPercent } from '../../src/assist/compare-overlap';

describe('compare overlap', () => {
    it('detects similar wording', () => {
        const a = 'Neural networks learn patterns from labeled training data.';
        const b = 'Neural networks learn patterns from training examples and labels.';
        const overlap = analyzeSnippetOverlap(a, b);
        expect(overlap.noteKey).toBe('assist.compare.overlap.similar');
        expect(overlap.sharedTerms.length).toBeGreaterThan(0);
        expect(formatOverlapPercent(overlap.overlapScore)).toBeGreaterThan(30);
    });

    it('flags distinct snippets', () => {
        const overlap = analyzeSnippetOverlap(
            'Quarterly revenue beat expectations in healthcare.',
            'The spacecraft entered lunar orbit after correction burn.'
        );
        expect(overlap.noteKey).toBe('assist.compare.overlap.distinct');
        expect(overlap.sharedTerms).toEqual([]);
    });

    it('handles empty input', () => {
        const overlap = analyzeSnippetOverlap('   ', 'something meaningful here');
        expect(overlap.noteKey).toBe('assist.compare.overlap.empty');
    });
});
