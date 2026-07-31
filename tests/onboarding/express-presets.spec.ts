import { describe, expect, it } from 'vitest';
import {
    buildExpressOnboardingPatch,
    buildOnboardingStoragePatch,
} from '../../src/onboarding/apply-onboarding';
import {
    EXPRESS_PRESET_IDS,
    getExpressPreset,
    isExpressPresetId,
    listExpressPresets,
} from '../../src/onboarding/express-presets';
import { BOTHER_KEYWORD_MAP } from '../../src/core/types/bother-keywords';
import { LOCALE_STORAGE_KEY } from '../../src/i18n/types';

describe('express lifestyle presets', () => {
    it('exposes the catalog from the purposeful-browsing roadmap', () => {
        expect(EXPRESS_PRESET_IDS).toEqual([
            'focus-calm',
            'less-politics',
            'tech-music',
            'comment-shield',
            'deep-read',
        ]);
        expect(listExpressPresets()).toHaveLength(EXPRESS_PRESET_IDS.length);
        expect(isExpressPresetId('tech-music')).toBe(true);
        expect(isExpressPresetId('unknown')).toBe(false);
    });

    it('tech-music seeds Focus + geopolitics keywords + topic allow/block lists', () => {
        const patch = buildExpressOnboardingPatch({
            setupPath: 'express',
            expressPresetId: 'tech-music',
            localeId: 'en',
        });

        expect(patch[LOCALE_STORAGE_KEY]).toBe('en');
        expect(patch.onboardingComplete).toBe(true);
        expect(patch.activeBrowsingModeId).toBe('focus');
        expect(patch.expressPresetId).toBe('tech-music');
        expect(patch.userKeywords).toEqual(
            expect.arrayContaining([
                ...BOTHER_KEYWORD_MAP.outrage.slice(0, 1),
                ...BOTHER_KEYWORD_MAP.geopolitics.slice(0, 1),
            ])
        );
        expect(patch.userRules).toMatchObject({
            allowDomains: expect.arrayContaining(['open.spotify.com']),
        });
        expect(patch.topicPolicy).toEqual({
            enabled: false,
            blockTopics: ['world-affairs', 'domestic-politics'],
            allowTopics: ['tech', 'music', 'culture-arts'],
        });
    });

    it('less-politics adds geopolitics keywords and politics topic blocks without allowlist', () => {
        const patch = buildExpressOnboardingPatch({
            setupPath: 'express',
            expressPresetId: 'less-politics',
            localeId: 'de',
        });
        expect(patch.activeBrowsingModeId).toBe('focus');
        expect(patch.userKeywords).toEqual(
            expect.arrayContaining([...BOTHER_KEYWORD_MAP.geopolitics.slice(0, 1)])
        );
        expect(patch.topicPolicy).toMatchObject({
            enabled: false,
            blockTopics: ['world-affairs', 'domestic-politics'],
            allowTopics: [],
        });
        expect(patch.userRules).toMatchObject({ allowDomains: [] });
    });

    it('deep-read uses Research mode with conservative policy', () => {
        const patch = buildExpressOnboardingPatch({
            setupPath: 'express',
            expressPresetId: 'deep-read',
            localeId: 'en',
        });
        expect(patch.activeBrowsingModeId).toBe('research');
        expect(patch.policy).toMatchObject({ preset: 'conservative' });
        expect(getExpressPreset('deep-read').extraBotherCategories).toEqual([]);
    });

    it('comment-shield uses Unwind for toxic comment survival', () => {
        const patch = buildExpressOnboardingPatch({
            setupPath: 'express',
            expressPresetId: 'comment-shield',
            localeId: 'en',
        });
        expect(patch.activeBrowsingModeId).toBe('unwind');
        expect(patch.policy).toMatchObject({ preset: 'strict' });
    });

    it('routes express drafts through buildOnboardingStoragePatch', () => {
        const patch = buildOnboardingStoragePatch({
            setupPath: 'express',
            expressPresetId: 'focus-calm',
            localeId: 'en',
        });
        expect(patch.expressPresetId).toBe('focus-calm');
        expect(patch.activeBrowsingModeId).toBe('focus');
        expect(patch.topicPolicy).toMatchObject({ enabled: false });
    });
});
