import { describe, expect, it } from 'vitest';
import { buildMainTextFromUnits } from '../../src/mods/analyzers/authenticity/page-context';
import { filterClaimsWithT1, scoreCheckworthiness } from '../../src/mods/analyzers/authenticity/t1-checkworthiness';
import type { Claim } from '../../src/mods/analyzers/authenticity/types';

describe('Authenticity v2', () => {
    it('scoreCheckworthiness favors factual-sounding claims', () => {
        const factual = scoreCheckworthiness(
            'According to the study, 42% of respondents reported official data shows a million dollar gap.'
        );
        const opinion = scoreCheckworthiness('I think this is obviously the best approach for everyone.');
        expect(factual.score).toBeGreaterThan(opinion.score);
    });

    it('filterClaimsWithT1 keeps high-scoring claims first', () => {
        const claims: readonly Claim[] = [
            { id: 'c1', text: 'I think this is nice.', type: 'opinion' },
            {
                id: 'c2',
                text: 'Official data shows 90% growth according to the annual report published today.',
                type: 'factual',
            },
        ];
        const result = filterClaimsWithT1(claims, 2);
        expect(result.claims[0]?.id).toBe('c2');
        expect(result.notes.some((n) => n.includes('authenticity.notes.t1'))).toBe(true);
    });

    it('buildMainTextFromUnits dedupes and respects max length', () => {
        const text = buildMainTextFromUnits(
            [
                { id: 'a', text: 'Alpha paragraph with enough words to pass the minimum length threshold here.', preview: '' },
                { id: 'b', text: 'Beta paragraph with enough words to pass the minimum length threshold here.', preview: '' },
                { id: 'c', text: 'Alpha paragraph with enough words to pass the minimum length threshold here.', preview: '' },
            ],
            500
        );
        expect(text).toContain('Alpha');
        expect(text).toContain('Beta');
        expect(text.split('Alpha paragraph').length - 1).toBe(1);
    });
});
