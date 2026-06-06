import { describe, expect, it, vi } from 'vitest';
import {
    enrichClaimReviewReferences,
    parseClaimReviewSearchBody,
    searchClaimReview,
} from '../../src/mods/analyzers/authenticity/claimreview-retrieval';
import { hitsToReferences } from '../../src/mods/analyzers/authenticity/t2-search';

describe('ClaimReview retrieval', () => {
    it('parseClaimReviewSearchBody maps structured reviews to hits', () => {
        const hits = parseClaimReviewSearchBody(
            {
                claims: [
                    {
                        text: 'Vaccines cause autism',
                        claimReview: [
                            {
                                url: 'https://www.snopes.com/fact-check/example/',
                                title: 'Do vaccines cause autism?',
                                textualRating: 'False',
                                publisher: { name: 'Snopes' },
                            },
                        ],
                    },
                ],
            },
            5
        );

        expect(hits).toHaveLength(1);
        expect(hits[0]?.url).toContain('snopes.com');
        expect(hits[0]?.textualRating).toBe('False');
        expect(hits[0]?.description).toContain('Snopes');
    });

    it('searchClaimReview returns empty without API key', async () => {
        const fetchMock = vi.fn();
        const hits = await searchClaimReview('test query', '', 3, fetchMock);
        expect(hits).toEqual([]);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('searchClaimReview parses API response', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                claims: [
                    {
                        claimReview: [
                            {
                                url: 'https://factcheck.org/a/',
                                title: 'Claim A',
                                textualRating: 'Mostly False',
                                publisher: { name: 'FactCheck.org' },
                            },
                        ],
                    },
                ],
            }),
        });

        const hits = await searchClaimReview('climate change', 'test-key', 3, fetchMock);
        expect(hits).toHaveLength(1);
        expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('factchecktools.googleapis.com'));
    });

    it('enrichClaimReviewReferences marks structured snippets verified', () => {
        const refs = hitsToReferences(
            [
                {
                    url: 'https://factcheck.org/a/',
                    title: 'Claim A',
                    description: 'FactCheck.org: Mostly False',
                    textualRating: 'Mostly False',
                    publisher: 'FactCheck.org',
                },
            ],
            'claim-1'
        );
        const hitsByUrl = new Map([
            [
                'https://factcheck.org/a/',
                {
                    url: 'https://factcheck.org/a/',
                    title: 'Claim A',
                    description: 'FactCheck.org: Mostly False',
                    textualRating: 'Mostly False',
                    publisher: 'FactCheck.org',
                },
            ],
        ]);

        const enriched = enrichClaimReviewReferences(refs, hitsByUrl);
        expect(enriched[0]?.snippetVerified).toBe(true);
        expect(enriched[0]?.stance).toBe('contradicts');
    });
});
