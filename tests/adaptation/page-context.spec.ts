import { describe, expect, it } from 'vitest';
import { detectPageContexts, packAppliesToPageContext } from '../../src/core/adaptation/page-context';

describe('page-context', () => {
    it('detects social-feed on Reddit and X', () => {
        expect(detectPageContexts('https://www.reddit.com/r/news/comments/abc/title/')).toContain('social-feed');
        expect(detectPageContexts('https://x.com/user/status/123')).toContain('social-feed');
    });

    it('detects news on publisher hosts and paths', () => {
        expect(detectPageContexts('https://www.bbc.com/news/world-123')).toContain('news');
        expect(detectPageContexts('https://example.com/article/climate-report')).toContain('news');
    });

    it('detects ecommerce on shop hosts and paths', () => {
        expect(detectPageContexts('https://www.amazon.com/dp/B0123')).toContain('ecommerce');
        expect(detectPageContexts('https://boutique.example.com/shop/shoes')).toContain('ecommerce');
    });

    it('returns no contexts on academic hosts', () => {
        expect(detectPageContexts('https://arxiv.org/abs/2401.12345')).toEqual([]);
        expect(detectPageContexts('https://scholar.google.com/scholar?q=test')).toEqual([]);
    });

    it('gates packs when page context does not match', () => {
        expect(packAppliesToPageContext(['social-feed'], ['news'])).toBe(false);
        expect(packAppliesToPageContext(['social-feed', 'news'], ['news'])).toBe(true);
        expect(packAppliesToPageContext(['ecommerce'], [])).toBe(false);
        expect(packAppliesToPageContext(undefined, [])).toBe(true);
    });
});
