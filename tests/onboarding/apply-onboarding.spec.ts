import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
    buildCustomOnboardingPatch,
    buildOnboardingStoragePatch,
    buildPresetModeOnboardingPatch,
} from '../../src/onboarding/apply-onboarding';
import { LOCALE_STORAGE_KEY } from '../../src/i18n/types';

describe('apply onboarding', () => {
    it('persists preferredLocale from preset mode draft', () => {
        const patch = buildOnboardingStoragePatch({
            setupPath: 'preset-mode',
            browsingModeId: 'focus',
            localeId: 'de',
        });
        expect(patch[LOCALE_STORAGE_KEY]).toBe('de');
        expect(patch.onboardingComplete).toBe(true);
        expect(patch.activeBrowsingModeId).toBe('focus');
        expect(patch.enabledModIds).toContain('detector-heuristic-keywords');
    });

    it('applies custom path with browsing mode and style overrides', () => {
        const patch = buildCustomOnboardingPatch({
            setupPath: 'custom',
            localeId: 'en',
            browsingModeId: 'research',
            actionId: 'dim',
            preset: 'balanced',
        });
        expect(patch.activeBrowsingModeId).toBe('research');
        expect(patch.enabledModIds).toContain('detector-noise-patterns');
        expect(patch.enabledModIds).toContain('detector-behavior-signals');
        expect(patch.policy).toMatchObject({ preset: 'balanced' });
        expect(patch.userRules).toMatchObject({
            allowKeywords: [],
        });
    });

    it('preset focus mode enables balanced policy and keyword topics', () => {
        const patch = buildPresetModeOnboardingPatch({
            setupPath: 'preset-mode',
            browsingModeId: 'focus',
            localeId: 'en',
        });
        expect(patch.policy).toMatchObject({ preset: 'balanced' });
        expect(patch.userKeywords).toEqual(expect.arrayContaining(['sponsored', "you won't believe"]));
    });

    it('applies whitelist preset domains during onboarding', () => {
        const patch = buildPresetModeOnboardingPatch({
            setupPath: 'preset-mode',
            browsingModeId: 'focus',
            localeId: 'en',
            whitelistPresetIds: ['google-workspace'],
        });
        expect(patch.userRules).toMatchObject({
            allowDomains: expect.arrayContaining(['mail.google.com', 'docs.google.com']),
        });
    });
});
