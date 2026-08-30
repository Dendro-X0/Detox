import en from './locales/en.json' with { type: 'json' };
import de from './locales/de.json' with { type: 'json' };
import type { LocaleBundle, LocaleCatalogEntry, LocaleId } from './types';

export const DEFAULT_LOCALE_ID: LocaleId = 'en';

const LOCALE_BUNDLES: Readonly<Record<LocaleId, LocaleBundle>> = {
    en,
    de,
};

/** Locales available in the UI — add an entry here when shipping a new JSON template. */
export const LOCALE_CATALOG: readonly LocaleCatalogEntry[] = [
    { id: 'en', nativeName: en.meta.nativeName, englishName: en.meta.englishName },
    { id: 'de', nativeName: de.meta.nativeName, englishName: de.meta.englishName },
];

const LOCALE_IDS = new Set<string>(LOCALE_CATALOG.map((entry) => entry.id));

export function isLocaleId(value: string): value is LocaleId {
    return LOCALE_IDS.has(value);
}

export function getLocaleBundle(localeId: LocaleId): LocaleBundle {
    return LOCALE_BUNDLES[localeId];
}

export function resolveLocaleId(candidate: string | undefined | null): LocaleId {
    if (candidate && isLocaleId(candidate)) return candidate;
    return DEFAULT_LOCALE_ID;
}

/** Match browser language to a shipped locale template, else default. */
export function localeIdFromBrowserLanguage(browserLanguage: string): LocaleId {
    const normalized = browserLanguage.trim().toLowerCase();
    if (!normalized) return DEFAULT_LOCALE_ID;

    if (isLocaleId(normalized)) return normalized;

    const base = normalized.split('-')[0];
    if (base && isLocaleId(base)) return base;

    return DEFAULT_LOCALE_ID;
}
