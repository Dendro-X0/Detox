import { describe, expect, it } from 'vitest';
import {
    buildCustomOnboardingPatch,
    buildExpressOnboardingPatch,
    buildPresetModeOnboardingPatch,
} from '../../src/onboarding/apply-onboarding';
import {
    WIZARD_BASE_STORAGE_KEYS,
    WIZARD_EXPRESS_STORAGE_KEYS,
    WIZARD_PRESET_MODE_STORAGE_KEYS,
    WIZARD_USER_RULES_FIELDS,
} from '../../src/onboarding/wizard-coverage';

describe('wizard-first storage coverage', () => {
    it('preset mode writes all base and mode keys', () => {
        const patch = buildPresetModeOnboardingPatch({
            setupPath: 'preset-mode',
            browsingModeId: 'focus',
            localeId: 'en',
            whitelistPresetIds: ['google-workspace'],
        });

        for (const key of WIZARD_BASE_STORAGE_KEYS) {
            expect(patch).toHaveProperty(key);
        }
        for (const key of WIZARD_PRESET_MODE_STORAGE_KEYS) {
            expect(patch).toHaveProperty(key);
        }

        expect(patch.enabled).toBe(true);
        expect(patch.onboardingComplete).toBe(true);
        expect(patch.activeBrowsingModeId).toBe('focus');
    });

    it('preset mode populates userRules fields needed for filtering', () => {
        const patch = buildPresetModeOnboardingPatch({
            setupPath: 'preset-mode',
            browsingModeId: 'focus',
            localeId: 'en',
        });
        const rules = patch.userRules as Record<string, unknown>;

        for (const field of WIZARD_USER_RULES_FIELDS) {
            expect(rules).toHaveProperty(field);
        }
        expect(rules.blockKeywords).toEqual(expect.arrayContaining(['sponsored']));
        expect(rules.allowDomains).toEqual(expect.any(Array));
    });

    it('express path writes lifestyle preset seeds including topicPolicy', () => {
        const patch = buildExpressOnboardingPatch({
            setupPath: 'express',
            expressPresetId: 'tech-music',
            localeId: 'en',
        });

        for (const key of WIZARD_BASE_STORAGE_KEYS) {
            expect(patch).toHaveProperty(key);
        }
        for (const key of WIZARD_EXPRESS_STORAGE_KEYS) {
            expect(patch).toHaveProperty(key);
        }

        expect(patch.expressPresetId).toBe('tech-music');
        expect(patch.activeBrowsingModeId).toBe('focus');
        expect(patch.topicPolicy).toMatchObject({
            enabled: false,
            blockTopics: ['world-affairs', 'domestic-politics'],
            allowTopics: ['tech', 'music', 'culture-arts'],
        });
        const rules = patch.userRules as Record<string, unknown>;
        for (const field of WIZARD_USER_RULES_FIELDS) {
            expect(rules).toHaveProperty(field);
        }
    });

    it('custom path writes mode + policy without keyword curation', () => {
        const patch = buildCustomOnboardingPatch({
            setupPath: 'custom',
            localeId: 'en',
            browsingModeId: 'focus',
            actionId: 'dim',
            preset: 'strict',
            whitelistPresetIds: ['music-lyrics'],
        });

        expect(patch.activeBrowsingModeId).toBe('focus');
        expect(patch.policy).toMatchObject({ preset: 'strict', threshold: 0.3 });
        expect(patch.userRules).toMatchObject({
            allowDomains: expect.arrayContaining(['open.spotify.com']),
            allowKeywords: [],
        });
        expect(patch.enforcementAction).toMatchObject({ activeActionId: 'dim' });
    });
});