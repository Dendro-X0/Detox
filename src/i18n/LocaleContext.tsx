import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { LOCALE_CATALOG, getLocaleBundle } from './registry';
import { loadPreferredLocaleIdSync, resolveInitialLocaleId, savePreferredLocaleId } from './locale-store';
import { translate } from './translate';
import type { LocaleCatalogEntry, LocaleId } from './types';

type LocaleContextValue = {
    readonly localeId: LocaleId;
    readonly availableLocales: readonly LocaleCatalogEntry[];
    readonly browserSuggestedLocaleId: LocaleId;
    readonly setLocaleId: (localeId: LocaleId) => void;
    readonly t: (key: string, values?: Readonly<Record<string, string | number>>) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

type LocaleProviderProps = {
    readonly children: ReactNode;
};

export function LocaleProvider({ children }: LocaleProviderProps) {
    const browserSuggestedLocaleId = useMemo(
        () => resolveInitialLocaleId(undefined, navigator.language),
        []
    );
    const [localeId, setLocaleIdState] = useState<LocaleId>(browserSuggestedLocaleId);

    useEffect(() => {
        loadPreferredLocaleIdSync((stored) => {
            setLocaleIdState(resolveInitialLocaleId(stored, navigator.language));
        });
    }, [browserSuggestedLocaleId]);

    const setLocaleId = useCallback((nextLocaleId: LocaleId) => {
        setLocaleIdState(nextLocaleId);
        void savePreferredLocaleId(nextLocaleId);
    }, []);

    const bundle = useMemo(() => getLocaleBundle(localeId), [localeId]);

    const t = useCallback(
        (key: string, values?: Readonly<Record<string, string | number>>) => translate(bundle, key, values),
        [bundle]
    );

    const value = useMemo<LocaleContextValue>(
        () => ({
            localeId,
            availableLocales: LOCALE_CATALOG,
            browserSuggestedLocaleId,
            setLocaleId,
            t,
        }),
        [browserSuggestedLocaleId, localeId, setLocaleId, t]
    );

    return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
    const context = useContext(LocaleContext);
    if (!context) {
        throw new Error('useLocale must be used within LocaleProvider');
    }
    return context;
}
