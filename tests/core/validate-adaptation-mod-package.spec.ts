import { describe, expect, it } from 'vitest';
import { validateAdaptationModPackagePayload } from '../../src/core/mods/validate-adaptation-mod-package';
import type { ModPackagePayload } from '../../src/core/mods/mod-package-types';

const basePayload: ModPackagePayload = {
    format: 'signallens-mod/1',
    modId: 'adaptation-fr-promo',
    version: '1.0.0',
    name: 'French promo',
    kind: 'adaptation-pack',
    description: 'Community French promo pack for tests.',
    permissionsSummary: 'Local only. No network.',
    pack: {
        format: 'signallens-adaptation/1',
        packId: 'adaptation-fr-promo',
        version: '1.0.0',
        languages: ['fr'],
        contexts: ['ecommerce'],
        privacy: {
            networkAccess: false,
            persistsPageContent: false,
            telemetry: false,
        },
        supplementalKeywords: ['promo locale'],
    },
    adaptationMeta: {
        packCategory: 'language',
        languages: ['fr'],
        contexts: ['ecommerce'],
        contentTypes: ['promotional'],
    },
};

describe('validateAdaptationModPackagePayload', () => {
    it('accepts a valid community adaptation package', () => {
        expect(validateAdaptationModPackagePayload(basePayload)).toBeNull();
    });

    it('rejects packId mismatch', () => {
        const error = validateAdaptationModPackagePayload({
            ...basePayload,
            pack: { ...basePayload.pack!, packId: 'adaptation-other' },
        });
        expect(error).toMatch(/packId/);
    });

    it('rejects missing adaptationMeta for community packs', () => {
        const error = validateAdaptationModPackagePayload({
            ...basePayload,
            adaptationMeta: undefined,
        });
        expect(error).toMatch(/adaptationMeta/);
    });
});
