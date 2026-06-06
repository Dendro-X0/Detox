import { describe, expect, it } from 'vitest';
import { buildWizardDefaultsPatch } from '../../src/core/settings/restore-wizard-defaults';
import { WIZARD_PRESET_MODE_STORAGE_KEYS } from '../../src/onboarding/wizard-coverage';

describe('restore wizard defaults', () => {
    it('buildWizardDefaultsPatch matches Focus preset onboarding shape', () => {
        const patch = buildWizardDefaultsPatch('en');
        for (const key of WIZARD_PRESET_MODE_STORAGE_KEYS) {
            expect(patch).toHaveProperty(key);
        }
        expect(patch.activeBrowsingModeId).toBe('focus');
        expect(patch.enabled).toBe(true);
        expect(patch.onboardingComplete).toBe(true);
        const rules = patch.userRules as { blockKeywords: string[]; allowDomains: string[] };
        expect(rules.blockKeywords.length).toBeGreaterThan(0);
        expect(rules.allowDomains).toEqual([]);
        expect(patch.policy).toMatchObject({ preset: 'balanced', threshold: 0.5, perSite: {} });
    });
});
