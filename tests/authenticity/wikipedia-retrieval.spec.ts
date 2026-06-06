import { describe, expect, it, beforeEach } from 'vitest';
import {
    clearWikipediaExtractCache,
    isWikipediaArticleUrl,
    parseWikipediaExtractsBody,
    parseWikipediaOpensearchBody,
    titleFromWikipediaUrl,
    enrichWikipediaReferences,
    fetchWikipediaExtracts,
} from '../../src/mods/analyzers/authenticity/wikipedia-retrieval';
import type { SourceReference } from '../../src/mods/analyzers/authenticity/types';

describe('wikipedia retrieval', () => {
    beforeEach(() => {
        clearWikipediaExtractCache();
    });

    it('detects Wikipedia article URLs', () => {
        expect(isWikipediaArticleUrl('https://en.wikipedia.org/wiki/Coffee')).toBe(true);
        expect(isWikipediaArticleUrl('https://en.wikipedia.org/wiki/Special:Search')).toBe(false);
        expect(isWikipediaArticleUrl('https://example.com/wiki/Coffee')).toBe(false);
    });

    it('parses titles from Wikipedia URLs', () => {
        expect(titleFromWikipediaUrl('https://en.wikipedia.org/wiki/Type_2_diabetes')).toBe('Type 2 diabetes');
    });

    it('parseWikipediaOpensearchBody maps API tuples to hits', () => {
        const hits = parseWikipediaOpensearchBody(
            [
                'query',
                ['Coffee', 'Espresso'],
                ['Beverage', 'Concentrated coffee'],
                ['https://en.wikipedia.org/wiki/Coffee', 'https://en.wikipedia.org/wiki/Espresso'],
            ],
            5
        );
        expect(hits).toHaveLength(2);
        expect(hits[0]?.title).toBe('Coffee');
        expect(hits[0]?.description).toBe('Beverage');
        expect(hits[0]?.url).toContain('Coffee');
    });

    it('parseWikipediaExtractsBody maps query pages to extracts', () => {
        const map = parseWikipediaExtractsBody({
            query: {
                pages: {
                    '123': { title: 'Coffee', extract: 'Coffee is a brewed drink.' },
                },
            },
        });
        expect(map.get('Coffee')).toBe('Coffee is a brewed drink.');
    });

    it('enrichWikipediaReferences fetches API extracts for wiki refs', async () => {
        const refs: SourceReference[] = [
            {
                id: 'c1-ref-1',
                url: 'https://en.wikipedia.org/wiki/Coffee',
                title: 'Coffee',
                snippet: 'short opensearch blurb',
                fetchedAt: 0,
                snippetVerified: false,
                stance: 'unknown',
            },
        ];

        const mockFetch = async (input: RequestInfo | URL): Promise<Response> => {
            const url = String(input);
            expect(url).toContain('action=query');
            return Response.json({
                query: {
                    pages: {
                        '1': { title: 'Coffee', extract: 'Coffee is a brewed drink prepared from roasted beans.' },
                    },
                },
            });
        };

        const enriched = await enrichWikipediaReferences(refs, 800, mockFetch as typeof fetch);
        expect(enriched[0]?.snippetVerified).toBe(true);
        expect(enriched[0]?.snippet).toContain('roasted beans');
        expect(enriched[0]?.fetchedAt).toBeGreaterThan(0);
    });

    it('fetchWikipediaExtracts uses session cache on repeat titles', async () => {
        let calls = 0;
        const mockFetch = async (): Promise<Response> => {
            calls += 1;
            return Response.json({
                query: { pages: { '1': { title: 'Tea', extract: 'Tea is an aromatic beverage.' } } },
            });
        };

        await fetchWikipediaExtracts(['Tea'], 500, mockFetch as typeof fetch);
        await fetchWikipediaExtracts(['Tea'], 500, mockFetch as typeof fetch);
        expect(calls).toBe(1);
    });
});
