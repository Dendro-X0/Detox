import { localeIdFromBrowserLanguage, resolveLocaleId } from './registry';
import { LOCALE_STORAGE_KEY, type LocaleId } from './types';

export async function loadPreferredLocaleId(): Promise<LocaleId> {
    const stored = await chrome.storage.local.get(LOCALE_STORAGE_KEY);
    const record = stored as { readonly [LOCALE_STORAGE_KEY]?: string };
    return resolveLocaleId(record[LOCALE_STORAGE_KEY]);
}

export function loadPreferredLocaleIdSync(onReady: (storedLocaleId: string | undefined) => void): void {
    chrome.storage.local.get(LOCALE_STORAGE_KEY, (result: unknown) => {
        const record = result as { readonly preferredLocale?: string };
        onReady(record.preferredLocale);
    });
}

export async function savePreferredLocaleId(localeId: LocaleId): Promise<void> {
    await chrome.storage.local.set({ [LOCALE_STORAGE_KEY]: localeId });
}

export function resolveInitialLocaleId(storedLocaleId: string | undefined, browserLanguage: string): LocaleId {
    if (storedLocaleId) {
        return resolveLocaleId(storedLocaleId);
    }
    return localeIdFromBrowserLanguage(browserLanguage);
}
