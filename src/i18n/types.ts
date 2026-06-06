import type en from './locales/en.json';

/** Supported UI locale ids — extend when adding locale JSON templates. */
export type LocaleId = 'en' | 'de';

export type LocaleBundle = typeof en;

export type LocaleMeta = LocaleBundle['meta'];

export type LocaleCatalogEntry = {
    readonly id: LocaleId;
    readonly nativeName: string;
    readonly englishName: string;
};

export const LOCALE_STORAGE_KEY = 'preferredLocale' as const;
