import { describe, expect, it } from 'vitest';
import { snippetOverlapsFetchedText } from '../../src/mods/analyzers/authenticity/snippet-verify';

describe('snippetOverlapsFetchedText', () => {
    it('accepts short snippets without strict overlap', () => {
        expect(snippetOverlapsFetchedText('any page text', 'short')).toBe(true);
    });

    it('requires probe overlap for long snippets', () => {
        const snippet =
            'Official data shows ninety percent growth according to the annual report published today in Washington.';
        const page =
            'Background intro. Official data shows ninety percent growth according to the annual report published today in Washington. Footer text.';
        expect(snippetOverlapsFetchedText(page, snippet)).toBe(true);
    });

    it('rejects when probe is absent from fetched text', () => {
        const snippet =
            'Completely different claim about lunar mining regulations and export controls from multiple agencies.';
        expect(snippetOverlapsFetchedText('Unrelated article about gardening and seasonal planting tips.', snippet)).toBe(
            false
        );
    });
});
