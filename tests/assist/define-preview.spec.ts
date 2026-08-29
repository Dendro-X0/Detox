import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fetchDefinePreview } from '../../src/assist/define-preview';

describe('assist define preview', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('returns title, url, and excerpt from opensearch + extracts', async () => {
        const fetchImpl = vi.fn(async (url: string) => {
            if (url.includes('action=opensearch')) {
                return new Response(
                    JSON.stringify([
                        'neural',
                        ['Neural network'],
                        ['ML model'],
                        ['https://en.wikipedia.org/wiki/Neural_network'],
                    ])
                );
            }
            return new Response(
                JSON.stringify({
                    query: {
                        pages: {
                            '1': {
                                title: 'Neural network',
                                extract: 'A neural network is a computational model.',
                            },
                        },
                    },
                })
            );
        }) as typeof fetch;

        const preview = await fetchDefinePreview('neural network', fetchImpl);
        expect(preview).toMatchObject({
            title: 'Neural network',
            url: 'https://en.wikipedia.org/wiki/Neural_network',
            excerpt: 'A neural network is a computational model.',
        });
    });

    it('throws cancelled when signal is aborted', async () => {
        const controller = new AbortController();
        controller.abort();
        await expect(fetchDefinePreview('x', fetch, controller.signal)).rejects.toThrow('cancelled');
    });
});
