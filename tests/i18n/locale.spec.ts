import { describe, expect, it } from 'vitest';
import de from '../../src/i18n/locales/de.json';
import en from '../../src/i18n/locales/en.json';
import { LOCALE_CATALOG, getLocaleBundle, localeIdFromBrowserLanguage, resolveLocaleId } from '../../src/i18n/registry';
import { translate } from '../../src/i18n/translate';

const REQUIRED_WIZARD_KEYS = [
    'wizard.stepLabels.welcome',
    'wizard.stepLabels.language',
    'wizard.stepLabels.topics',
    'wizard.stepLabels.style',
    'wizard.stepLabels.mode',
    'wizard.stepLabels.done',
    'wizard.progress.stepOf',
    'wizard.mode.heading',
    'wizard.done.heading',
    'wizard.shell.title',
    'wizard.shell.subtitle',
    'wizard.welcome.heading',
    'wizard.language.heading',
    'wizard.language.description',
    'wizard.topics.heading',
    'wizard.style.heading',
    'wizard.sensitivity.heading',
    'common.back',
    'common.continue',
    'common.finishSetup',
    'common.saving',
] as const;

const REQUIRED_UI_KEYS = [
    ...REQUIRED_WIZARD_KEYS,
    'common.appName',
    'options.subtitle',
    'popup.openDashboard',
    'settings.tabs.overview',
    'settings.language.heading',
    'browsingModes.heading',
    'settings.filtering.inferenceHeading',
    'rules.heading',
    'plugins.heading',
    'mods.detector-heuristic-keywords.name',
    'authenticity.job.extractingClaims',
    'enforcement.filteredTitle',
    'content.authenticity.badgeTitle',
    'content.authenticity.status.default',
] as const;

function flattenLeafKeys(value: unknown, prefix = ''): string[] {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        return prefix ? [prefix] : [];
    }
    const record = value as Record<string, unknown>;
    const keys: string[] = [];
    for (const [key, nested] of Object.entries(record)) {
        const path = prefix ? `${prefix}.${key}` : key;
        if (typeof nested === 'string') {
            keys.push(path);
        } else {
            keys.push(...flattenLeafKeys(nested, path));
        }
    }
    return keys.sort();
}

describe('locale templates', () => {
    it('ships English template with required wizard keys', () => {
        for (const key of REQUIRED_WIZARD_KEYS) {
            expect(translate(en, key)).not.toBe(key);
        }
    });

    it('ships English template with required dashboard and popup keys', () => {
        for (const key of REQUIRED_UI_KEYS) {
            expect(translate(en, key)).not.toBe(key);
        }
    });

    it('ships German template with required keys', () => {
        for (const key of REQUIRED_UI_KEYS) {
            expect(translate(de, key)).not.toBe(key);
        }
    });

    it('German template mirrors English key structure', () => {
        const enKeys = flattenLeafKeys(en);
        const deKeys = flattenLeafKeys(de);
        expect(deKeys).toEqual(enKeys);
    });

    it('interpolates template variables', () => {
        expect(translate(en, 'wizard.language.browserDetected', { language: 'English' })).toContain('English');
        expect(translate(de, 'enforcement.filteredTitle', { labelId: 'politics', percent: '42.0' })).toContain('42.0');
    });

    it('catalog matches bundled locale metadata', () => {
        expect(LOCALE_CATALOG).toHaveLength(2);
        expect(LOCALE_CATALOG.map((entry) => entry.id)).toEqual(['en', 'de']);
        expect(getLocaleBundle('en').meta.nativeName).toBe('English');
        expect(getLocaleBundle('de').meta.nativeName).toBe('Deutsch');
    });

    it('resolves browser language to shipped locale or default', () => {
        expect(localeIdFromBrowserLanguage('en-US')).toBe('en');
        expect(localeIdFromBrowserLanguage('de-DE')).toBe('de');
        expect(resolveLocaleId('de')).toBe('de');
        expect(resolveLocaleId('invalid')).toBe('en');
    });
});
