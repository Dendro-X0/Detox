/// <reference types="chrome" />
import {
    DEFAULT_ASSIST_SETTINGS,
    type AssistSearchEngineId,
    type AssistSettings,
} from './types';

const STORAGE_KEY = 'assistSettings';

let current: AssistSettings = DEFAULT_ASSIST_SETTINGS;

function isSearchEngineId(value: unknown): value is AssistSearchEngineId {
    return value === 'duckduckgo' || value === 'google' || value === 'bing' || value === 'custom';
}

export function parseAssistSettings(raw: unknown): AssistSettings {
    if (!raw || typeof raw !== 'object') return DEFAULT_ASSIST_SETTINGS;
    const record = raw as Partial<AssistSettings>;
    return {
        selectionToolbarEnabled: record.selectionToolbarEnabled !== false,
        searchEngineId: isSearchEngineId(record.searchEngineId)
            ? record.searchEngineId
            : DEFAULT_ASSIST_SETTINGS.searchEngineId,
        customSearchUrlTemplate:
            typeof record.customSearchUrlTemplate === 'string' &&
            record.customSearchUrlTemplate.includes('%s')
                ? record.customSearchUrlTemplate
                : DEFAULT_ASSIST_SETTINGS.customSearchUrlTemplate,
        dailyActionQuota:
            typeof record.dailyActionQuota === 'number' &&
            record.dailyActionQuota >= 1 &&
            record.dailyActionQuota <= 500
                ? Math.floor(record.dailyActionQuota)
                : DEFAULT_ASSIST_SETTINGS.dailyActionQuota,
    };
}

export function getAssistSettings(): AssistSettings {
    return current;
}

export async function loadAssistSettings(): Promise<AssistSettings> {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    current = parseAssistSettings((result as { readonly assistSettings?: unknown }).assistSettings);
    return current;
}

export async function saveAssistSettings(next: AssistSettings): Promise<void> {
    current = parseAssistSettings(next);
    await chrome.storage.local.set({ [STORAGE_KEY]: current });
}

export function subscribeToAssistSettings(onChange: (settings: AssistSettings) => void): () => void {
    const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string): void => {
        if (area !== 'local' || !changes[STORAGE_KEY]) return;
        current = parseAssistSettings(changes[STORAGE_KEY].newValue);
        onChange(current);
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
}
