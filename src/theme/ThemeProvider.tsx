import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { applyThemePreference, loadThemePreference, saveThemePreference, type ResolvedUiTheme } from './apply-theme';
import type { UiThemePreference } from './types';

type ThemeContextValue = {
    readonly preference: UiThemePreference;
    readonly resolved: ResolvedUiTheme;
    readonly setPreference: (next: UiThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { readonly children: ReactNode }) {
    const [preference, setPreferenceState] = useState<UiThemePreference>('system');
    const [resolved, setResolved] = useState<ResolvedUiTheme>('light');

    useEffect(() => {
        void loadThemePreference().then((loaded) => {
            setPreferenceState(loaded);
            setResolved(applyThemePreference(loaded));
        });

        const media = window.matchMedia('(prefers-color-scheme: dark)');
        const onSystemChange = (): void => {
            setPreferenceState((current) => {
                if (current === 'system') {
                    setResolved(applyThemePreference('system'));
                }
                return current;
            });
        };
        media.addEventListener('change', onSystemChange);
        return () => media.removeEventListener('change', onSystemChange);
    }, []);

    const setPreference = useCallback((next: UiThemePreference) => {
        setPreferenceState(next);
        setResolved(applyThemePreference(next));
        void saveThemePreference(next);
    }, []);

    const value = useMemo(
        () => ({ preference, resolved, setPreference }),
        [preference, resolved, setPreference]
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme requires ThemeProvider');
    return ctx;
}
