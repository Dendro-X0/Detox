import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_AUTHENTICITY_SETTINGS } from '../../src/mods/analyzers/authenticity/settings';
import type { SourceReference } from '../../src/mods/analyzers/authenticity/types';

const enrichReferenceFromFetch = vi.fn();

vi.mock('../../src/mods/analyzers/authenticity/fetch-snippet', () => ({
    enrichReferenceFromFetch: (...args: unknown[]) => enrichReferenceFromFetch(...args),
}));

import { enrichUnverifiedReferencesFromFetch } from '../../src/mods/analyzers/authenticity/pipeline';

function makeRef(id: string, overrides: Partial<SourceReference> = {}): SourceReference {
    return {
        id,
        url: `https://example.com/${id}`,
        title: `Title ${id}`,
        snippet: 'probe snippet for verification',
        fetchedAt: 0,
        snippetVerified: false,
        stance: 'unknown',
        ...overrides,
    };
}

describe('enrichUnverifiedReferencesFromFetch', () => {
    beforeEach(() => {
        enrichReferenceFromFetch.mockReset();
        enrichReferenceFromFetch.mockImplementation(async (ref: SourceReference) => ({
            ...ref,
            snippet: 'fetched excerpt from page',
            snippetVerified: true,
            fetchedAt: Date.now(),
        }));
    });

    it('fetches unverified refs including search-only path', async () => {
        const refs = [makeRef('a'), makeRef('b', { snippetVerified: true, fetchedAt: 123 })];
        const allowed = new Set(refs.map((r) => r.url));
        const settings = { ...DEFAULT_AUTHENTICITY_SETTINGS, maxSearchResults: 2, maxClaims: 1 };

        const result = await enrichUnverifiedReferencesFromFetch(refs, allowed, settings);

        expect(enrichReferenceFromFetch).toHaveBeenCalledTimes(1);
        expect(result[0]?.snippetVerified).toBe(true);
        expect(result[1]).toEqual(refs[1]);
    });

    it('preserves refs beyond fetch cap', async () => {
        const refs = [makeRef('a'), makeRef('b'), makeRef('c')];
        const allowed = new Set(refs.map((r) => r.url));
        const settings = { ...DEFAULT_AUTHENTICITY_SETTINGS, maxSearchResults: 1, maxClaims: 1 };

        const result = await enrichUnverifiedReferencesFromFetch(refs, allowed, settings);

        expect(enrichReferenceFromFetch).toHaveBeenCalledTimes(1);
        expect(result).toHaveLength(3);
        expect(result[2]?.id).toBe('c');
    });
});
