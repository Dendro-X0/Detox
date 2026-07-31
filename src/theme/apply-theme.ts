import { UI_THEME_STORAGE_KEY, type UiThemePreference } from './types';

export type ResolvedUiTheme = 'light' | 'dark';

const THEME_ROOT_CLASSES = ['sl-app', 'sl-popup'] as const;

function resolveTheme(preference: UiThemePreference): ResolvedUiTheme {
    if (preference === 'light') return 'light';
    if (preference === 'dark') return 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyResolvedTheme(theme: ResolvedUiTheme): void {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
}

export function applyThemePreference(preference: UiThemePreference): ResolvedUiTheme {
    const resolved = resolveTheme(preference);
    applyResolvedTheme(resolved);
    return resolved;
}

export async function loadThemePreference(): Promise<UiThemePreference> {
    const result = await chrome.storage.local.get(UI_THEME_STORAGE_KEY);
    const value = (result as Record<string, unknown>)[UI_THEME_STORAGE_KEY];
    if (value === 'light' || value === 'dark' || value === 'system') return value;
    return 'system';
}

export async function saveThemePreference(preference: UiThemePreference): Promise<void> {
    await chrome.storage.local.set({ [UI_THEME_STORAGE_KEY]: preference });
    applyThemePreference(preference);
}

export function initThemeOnDocument(): void {
    for (const className of THEME_ROOT_CLASSES) {
        if (document.documentElement.classList.contains(className)) {
            void loadThemePreference().then(applyThemePreference);
            return;
        }
    }
}
