import { describe, expect, it } from 'vitest';
import { buildWizardAuthenticitySettings } from '../../src/onboarding/authenticity-opt-in';
import { buildPresetModeOnboardingPatch } from '../../src/onboarding/apply-onboarding';
import { DEFAULT_AUTHENTICITY_SETTINGS } from '../../src/mods/analyzers/authenticity/settings';

describe('wizard authenticity opt-in', () => {
    it('defaults to disabled settings when not opted in', () => {
        const settings = buildWizardAuthenticitySettings(undefined);
        expect(settings).toEqual(DEFAULT_AUTHENTICITY_SETTINGS);
    });

    it('enables search-only Wikipedia when opted in', () => {
        const settings = buildWizardAuthenticitySettings({ enabled: true });
        expect(settings.enabled).toBe(true);
        expect(settings.searchProvider).toBe('wikipedia');
        expect(settings.searchOnlyDefault).toBe(true);
        expect(settings.tierT3).toBe(false);
    });

    it('persists optional LLM key without enabling T3 in wizard', () => {
        const settings = buildWizardAuthenticitySettings({
            enabled: true,
            llmApiKey: 'sk-test',
        });
        expect(settings.llmApiKey).toBe('sk-test');
        expect(settings.tierT3).toBe(false);
    });

    it('writes authenticitySettings in onboarding patch', () => {
        const patch = buildPresetModeOnboardingPatch({
            setupPath: 'preset-mode',
            browsingModeId: 'focus',
            localeId: 'en',
            authenticityAssist: { enabled: true },
        });
        const auth = patch.authenticitySettings as { enabled: boolean; searchProvider: string };
        expect(auth.enabled).toBe(true);
        expect(auth.searchProvider).toBe('wikipedia');
    });
});
