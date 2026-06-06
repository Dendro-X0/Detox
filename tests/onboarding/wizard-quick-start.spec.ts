import { describe, expect, it } from 'vitest';
import { buildPresetModeOnboardingPatch } from '../../src/onboarding/apply-onboarding';
import { WIZARD_BASE_STORAGE_KEYS, WIZARD_PRESET_MODE_STORAGE_KEYS } from '../../src/onboarding/wizard-coverage';
import { createFilteringStorageSeed } from '../helpers/extension-test-utils';

describe('wizard quick start parity', () => {
    it('Focus preset patch matches E2E seed shape for core filtering', () => {
        const wizardPatch = buildPresetModeOnboardingPatch({
            setupPath: 'preset-mode',
            browsingModeId: 'focus',
            localeId: 'en',
        });
        const e2eSeed = createFilteringStorageSeed();

        for (const key of [...WIZARD_BASE_STORAGE_KEYS, ...WIZARD_PRESET_MODE_STORAGE_KEYS]) {
            expect(wizardPatch).toHaveProperty(key);
        }

        expect(e2eSeed.enabled).toBe(true);
        expect(e2eSeed.onboardingComplete).toBe(true);
        expect(e2eSeed.activeBrowsingModeId).toBe('focus');
        expect(wizardPatch.policy).toMatchObject({ preset: 'balanced', threshold: 0.5 });
        expect(wizardPatch.enforcementAction).toMatchObject({ activeActionId: 'dim' });

        const wizardMods = wizardPatch.enabledModIds as readonly string[];
        const seedMods = e2eSeed.enabledModIds as readonly string[];
        expect(wizardMods).toEqual(expect.arrayContaining(['detector-heuristic-keywords', 'action-dim']));
        expect(seedMods).toEqual(expect.arrayContaining(['detector-heuristic-keywords', 'action-dim']));
    });

    it('quick start without whitelist still enables filtering keywords', () => {
        const patch = buildPresetModeOnboardingPatch({
            setupPath: 'preset-mode',
            browsingModeId: 'focus',
            localeId: 'en',
        });
        const rules = patch.userRules as { blockKeywords: readonly string[]; allowDomains: readonly string[] };
        expect(rules.blockKeywords.length).toBeGreaterThan(5);
        expect(rules.allowDomains).toEqual([]);
    });
});
