import { describe, expect, it } from 'vitest';
import { countKeywordHits, textMatchesKeyword, weightedKeywordHits } from '../../src/core/rules/keyword-match';

describe('keyword-match', () => {
    it('matches phrases with substring search', () => {
        expect(textMatchesKeyword('Limited offer today only', 'limited offer')).toBe(true);
    });

    it('matches longer tokens as substrings', () => {
        expect(textMatchesKeyword('This is outrageous behavior', 'outrageous')).toBe(true);
        expect(textMatchesKeyword('This is outrageous behavior', 'outrage')).toBe(true);
    });

    it('uses word boundaries for short tokens', () => {
        expect(textMatchesKeyword('lol this is funny', 'lol')).toBe(true);
        expect(textMatchesKeyword('symbolic logic course', 'lol')).toBe(false);
    });

    it('counts multiple distinct keyword hits', () => {
        expect(countKeywordHits('Outrageous spam clickbait headline', ['outrageous', 'spam', 'clickbait'])).toBe(3);
    });

    it('weights phrases higher than single tokens', () => {
        expect(weightedKeywordHits('Limited offer today', ['limited offer'])).toBe(2);
        expect(weightedKeywordHits('People are furious', ['furious'])).toBe(1);
    });
});
