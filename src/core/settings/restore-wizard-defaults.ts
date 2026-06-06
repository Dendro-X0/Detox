import { LOCALE_STORAGE_KEY, type LocaleId } from '../../i18n/types';
import { buildPresetModeOnboardingPatch } from '../../onboarding/apply-onboarding';

/** Focus-mode wizard defaults (matches install quick start). Preserves locale only. */
export function buildWizardDefaultsPatch(localeId: LocaleId): Record<string, unknown> {
    return buildPresetModeOnboardingPatch({
        setupPath: 'preset-mode',
        browsingModeId: 'focus',
        localeId,
    });
}

export async function restoreWizardDefaults(): Promise<void> {
    const result = await chrome.storage.local.get(LOCALE_STORAGE_KEY);
    const record = result as Record<string, string | undefined>;
    const localeId = (record[LOCALE_STORAGE_KEY] as LocaleId | undefined) ?? 'en';
    await chrome.storage.local.set(buildWizardDefaultsPatch(localeId));
}
