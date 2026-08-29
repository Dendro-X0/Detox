import { describe, expect, it, vi } from 'vitest';
import { buildCompareReport } from '../../src/assist/compare-report';
import { DEFAULT_ASSIST_SETTINGS } from '../../src/assist/types';

describe('compare report', () => {
    it('builds side-by-side report with retrieved excerpts', async () => {
        const fetchImpl = vi.fn(async (url: string) => {
            if (url.includes('action=opensearch')) {
                const query = url.includes('alpha') ? 'Alpha topic' : 'Beta topic';
                return new Response(
                    JSON.stringify([
                        query,
                        [query],
                        ['desc'],
                        [`https://en.wikipedia.org/wiki/${query.replace(/ /g, '_')}`],
                    ])
                );
            }
            return new Response(
                JSON.stringify({
                    query: {
                        pages: {
                            '1': {
                                title: url.includes('Alpha') ? 'Alpha topic' : 'Beta topic',
                                extract: 'Public excerpt for compare panel.',
                            },
                        },
                    },
                })
            );
        }) as typeof fetch;

        const report = await buildCompareReport(
            'alpha claim text',
            'beta claim text',
            DEFAULT_ASSIST_SETTINGS,
            fetchImpl
        );

        expect(report.sideA.label).toBe('clip');
        expect(report.sideB.label).toBe('selection');
        expect(report.sideA.excerpt).toContain('Public excerpt');
        expect(report.combinedSearchUrl).toContain(encodeURIComponent('"alpha claim text"'));
        expect(report.overlap.sharedTerms).toEqual(expect.any(Array));
    });
});
