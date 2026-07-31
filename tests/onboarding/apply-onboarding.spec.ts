import { describe, expect, it } from 'vitest';
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

    it('applies custom rules without an active browsing mode', () => {
        const patch = buildCustomOnboardingPatch({
            setupPath: 'custom',
            localeId: 'en',
            bothers: ['spam'],
            actionId: 'dim',
            preset: 'balanced',
        });
        expect(patch.activeBrowsingModeId).toBeNull();
        expect(patch.enabledModIds).toContain('detector-noise-patterns');
        expect(patch.enabledModIds).toContain('detector-behavior-signals');
        expect(patch.userRules).toMatchObject({
            blockKeywords: expect.arrayContaining(['buy now']),
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
