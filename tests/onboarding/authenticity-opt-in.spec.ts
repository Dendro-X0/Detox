import { describe, expect, it } from 'vitest';
import {
    buildWizardAssistSettings,
    buildWizardAuthenticitySettings,
} from '../../src/onboarding/authenticity-opt-in';
import { buildPresetModeOnboardingPatch } from '../../src/onboarding/apply-onboarding';
import { DEFAULT_ASSIST_SETTINGS } from '../../src/assist/types';
import { DEFAULT_AUTHENTICITY_SETTINGS } from '../../src/mods/analyzers/authenticity/settings';

describe('wizard Assist opt-in', () => {
    it('defaults to disabled Assist and authenticity when not opted in', () => {
        expect(buildWizardAssistSettings(undefined)).toEqual({
            ...DEFAULT_ASSIST_SETTINGS,
            selectionToolbarEnabled: false,
        });
        expect(buildWizardAuthenticitySettings(undefined)).toEqual(DEFAULT_AUTHENTICITY_SETTINGS);
    });

    it('enables selection toolbar when Assist is opted in without Verify', () => {
        const assist = buildWizardAssistSettings({ enabled: true });
        expect(assist.selectionToolbarEnabled).toBe(true);
        expect(buildWizardAuthenticitySettings({ enabled: true })).toEqual(DEFAULT_AUTHENTICITY_SETTINGS);
    });

    it('enables search-only Wikipedia Verify when sub-opt-in is checked', () => {
        const settings = buildWizardAuthenticitySettings({
            enabled: true,
            verifyEnabled: true,
        });
        expect(settings.enabled).toBe(true);
        expect(settings.searchProvider).toBe('wikipedia');
        expect(settings.searchOnlyDefault).toBe(true);
        expect(settings.tierT3).toBe(false);
    });

    it('persists optional LLM key without enabling T3 in wizard', () => {
        const settings = buildWizardAuthenticitySettings({
            enabled: true,
            verifyEnabled: true,
            llmApiKey: 'sk-test',
        });
        expect(settings.llmApiKey).toBe('sk-test');
        expect(settings.tierT3).toBe(false);
    });

    it('writes assistSettings and authenticitySettings in onboarding patch', () => {
        const patch = buildPresetModeOnboardingPatch({
            setupPath: 'preset-mode',
            browsingModeId: 'focus',
            localeId: 'en',
            authenticityAssist: { enabled: true, verifyEnabled: true },
        });
        const assist = patch.assistSettings as { selectionToolbarEnabled: boolean };
        const auth = patch.authenticitySettings as { enabled: boolean; searchProvider: string };
        expect(assist.selectionToolbarEnabled).toBe(true);
        expect(auth.enabled).toBe(true);
        expect(auth.searchProvider).toBe('wikipedia');
    });

    it('E4: Assist remains off when wizard opt-in is skipped', () => {
        const patch = buildPresetModeOnboardingPatch({
            setupPath: 'preset-mode',
            browsingModeId: 'focus',
            localeId: 'en',
        });
        const assist = patch.assistSettings as { selectionToolbarEnabled: boolean };
        const auth = patch.authenticitySettings as { enabled: boolean };
        expect(assist.selectionToolbarEnabled).toBe(false);
        expect(auth.enabled).toBe(false);
    });
});
