import { describe, expect, it } from 'vitest';
import { inferBotherCategoriesFromKeywords } from '../../src/onboarding/infer-bother-categories';

describe('inferBotherCategoriesFromKeywords', () => {
    it('maps known keywords to categories', () => {
        expect(inferBotherCategoriesFromKeywords(['sponsored', 'outrageous'])).toEqual(
            expect.arrayContaining(['spam', 'outrage'])
        );
    });

    it('falls back to default topics when no keywords match', () => {
        expect(inferBotherCategoriesFromKeywords(['zzzzunknown'])).toEqual(['outrage', 'spam']);
    });
});
