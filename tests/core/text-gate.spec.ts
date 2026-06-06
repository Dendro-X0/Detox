import { describe, expect, it } from 'vitest';
import { shouldClassifyText } from '../../src/core/pipeline/text-gate';

describe('shouldClassifyText', () => {
    it('skips very short blocks without signal phrases', () => {
        expect(shouldClassifyText('buy now')).toBe(false);
    });

    it('allows short blocks with high-signal promo phrases', () => {
        expect(shouldClassifyText('Sponsored — buy now!')).toBe(true);
    });

    it('allows typical comment-length English text', () => {
        const text =
            'This sponsored post is outrageous clickbait and you will not believe what happens next.';
        expect(shouldClassifyText(text)).toBe(true);
    });
});
