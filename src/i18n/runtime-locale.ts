import { formatFilteredTitle } from '../core/enforcement/format-filtered-title';
import { ENFORCEMENT_DATASET } from '../core/enforcement/element-state';
import type { Verdict } from '../core/types/verdict';
import { getLocaleBundle, resolveLocaleId } from './registry';
import { LOCALE_STORAGE_KEY, type LocaleId } from './types';
import { translate } from './translate';

let activeLocaleId: LocaleId = resolveLocaleId(undefined);
let activeBundle = getLocaleBundle(activeLocaleId);

export function getRuntimeLocaleId(): LocaleId {
    return activeLocaleId;
}

export function runtimeTranslate(
    key: string,
    values?: Readonly<Record<string, string | number>>
): string {
    return translate(activeBundle, key, values);
}

export function initRuntimeLocale(): Promise<void> {
    return new Promise((resolve) => {
        chrome.storage.local.get(LOCALE_STORAGE_KEY, (result: unknown) => {
            const record = result as { readonly preferredLocale?: string };
            activeLocaleId = resolveLocaleId(record.preferredLocale);
            activeBundle = getLocaleBundle(activeLocaleId);
            resolve();
        });
    });
}

export function subscribeRuntimeLocale(onChange: (localeId: LocaleId) => void): () => void {
    const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string): void => {
        if (area !== 'local' || !changes[LOCALE_STORAGE_KEY]) return;
        const next = changes[LOCALE_STORAGE_KEY].newValue;
        activeLocaleId = resolveLocaleId(typeof next === 'string' ? next : undefined);
        activeBundle = getLocaleBundle(activeLocaleId);
        onChange(activeLocaleId);
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
}

/** Re-apply titles on filtered elements after locale change. */
export function refreshFilteredElementTitles(): void {
    for (const element of document.querySelectorAll<HTMLElement>('[data-sl-blocked="true"]')) {
        const raw = element.dataset[ENFORCEMENT_DATASET.verdict];
        if (!raw) continue;
        try {
            const verdict = JSON.parse(raw) as Verdict;
            element.title = formatFilteredTitle(verdict);
        } catch {
            // ignore malformed stored verdict
        }
    }
}
