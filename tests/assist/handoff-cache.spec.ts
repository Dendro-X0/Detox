import { describe, expect, it } from 'vitest';
import {
    handoffCacheKey,
    isHandoffCacheFresh,
    pruneHandoffCache,
} from '../../src/assist/handoff-cache';

describe('assist handoff cache', () => {
    it('normalizes cache keys for the same query', () => {
        expect(handoffCacheKey('search', '  Hello   World ')).toBe(
            handoffCacheKey('search', 'hello world')
        );
    });

    it('expires entries after TTL', () => {
        const now = 1_000_000;
        const entry = { urls: ['https://example.test'], openedAt: now - 6 * 60 * 1000 };
        expect(isHandoffCacheFresh(entry, now)).toBe(false);
        expect(isHandoffCacheFresh({ ...entry, openedAt: now - 60_000 }, now)).toBe(true);
    });

    it('prunes stale map entries', () => {
        const now = 5_000_000;
        const pruned = pruneHandoffCache(
            {
                fresh: { urls: ['a'], openedAt: now - 1000 },
                stale: { urls: ['b'], openedAt: now - 10 * 60 * 1000 },
            },
            now
        );
        expect(Object.keys(pruned)).toEqual(['fresh']);
    });
});
