import { describe, expect, it } from 'vitest';
import { validateModMeta, validatePackJson, buildModPayload } from '../../scripts/adaptation-pack-utils.mjs';

const validPack = {
    format: 'signallens-adaptation/1',
    packId: 'adaptation-test-pack',
    version: '1.0.0',
    languages: ['en'],
    contexts: ['social-feed'],
    privacy: {
        networkAccess: false,
        persistsPageContent: false,
        telemetry: false,
    },
    supplementalKeywords: ['flash sale today'],
};

const validMeta = {
    modId: 'adaptation-test-pack',
    name: 'Test pack',
    version: '1.0.0',
    description: 'A test adaptation pack for unit tests.',
    permissionsSummary: 'Local pattern lists only. No network.',
    packCategory: 'language',
    languages: ['en'],
    contexts: ['social-feed'],
    contentTypes: ['promotional'],
};

describe('adaptation-pack-utils', () => {
    it('accepts a minimal valid pack', () => {
        expect(validatePackJson(validPack, { modId: validMeta.modId })).toEqual([]);
        expect(validateModMeta(validMeta)).toEqual([]);
    });

    it('rejects privacy flags that are not false', () => {
        const errors = validatePackJson(
            {
                ...validPack,
                privacy: { networkAccess: true, persistsPageContent: false, telemetry: false },
            },
            { modId: validMeta.modId }
        );
        expect(errors.some((e) => e.includes('networkAccess'))).toBe(true);
    });

    it('builds mod payload with inline pack', () => {
        const payload = buildModPayload(validMeta, validPack);
        expect(payload.kind).toBe('adaptation-pack');
        expect(payload.pack?.packId).toBe('adaptation-test-pack');
        expect(payload.adaptationMeta?.languages).toEqual(['en']);
    });
});
