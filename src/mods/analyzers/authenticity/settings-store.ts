import {
    DEFAULT_AUTHENTICITY_SETTINGS,
    type AuthenticityQuotaState,
    type AuthenticitySettings,
    type AuthenticityStorageRecord,
} from './settings';

let cachedSettings: AuthenticitySettings = DEFAULT_AUTHENTICITY_SETTINGS;
let cachedQuota: AuthenticityQuotaState = { date: todayKey(), used: 0 };

function todayKey(): string {
    return new Date().toISOString().slice(0, 10);
}

export function getAuthenticitySettings(): AuthenticitySettings {
    return cachedSettings;
}

export function getAuthenticityQuota(): AuthenticityQuotaState {
    return cachedQuota;
}

export async function loadAuthenticitySettings(): Promise<AuthenticitySettings> {
    const result = await chrome.storage.local.get(['authenticitySettings', 'authenticityQuota']);
    const record = result as AuthenticityStorageRecord;
    if (record.authenticitySettings) {
        cachedSettings = { ...DEFAULT_AUTHENTICITY_SETTINGS, ...record.authenticitySettings };
    }
    const quota = record.authenticityQuota;
    if (quota && quota.date === todayKey()) {
        cachedQuota = quota;
    } else {
        cachedQuota = { date: todayKey(), used: 0 };
    }
    return cachedSettings;
}

export async function saveAuthenticitySettings(settings: AuthenticitySettings): Promise<void> {
    cachedSettings = settings;
    await chrome.storage.local.set({ authenticitySettings: settings });
}

export async function consumeAuthenticityQuota(): Promise<boolean> {
    await loadAuthenticitySettings();
    if (cachedQuota.used >= cachedSettings.dailyQuota) return false;
    cachedQuota = { date: todayKey(), used: cachedQuota.used + 1 };
    await chrome.storage.local.set({ authenticityQuota: cachedQuota });
    return true;
}

export function subscribeToAuthenticitySettings(onChange: (settings: AuthenticitySettings) => void): void {
    chrome.storage.onChanged.addListener((changes) => {
        if (changes.authenticitySettings) {
            void loadAuthenticitySettings().then(onChange);
        }
    });
}
