import type { AssistSettings } from './types';
import { loadAssistSettings } from './assist-settings-store';

export type AssistQuotaState = {
    readonly date: string;
    readonly used: number;
};

const QUOTA_STORAGE_KEY = 'assistQuota';

let cachedQuota: AssistQuotaState = { date: todayKey(), used: 0 };

function todayKey(): string {
    return new Date().toISOString().slice(0, 10);
}

export function getAssistQuota(): AssistQuotaState {
    return cachedQuota;
}

export async function loadAssistQuota(): Promise<AssistQuotaState> {
    const result = await chrome.storage.local.get(QUOTA_STORAGE_KEY);
    const quota = (result as { readonly assistQuota?: AssistQuotaState }).assistQuota;
    if (quota && quota.date === todayKey()) {
        cachedQuota = quota;
    } else {
        cachedQuota = { date: todayKey(), used: 0 };
    }
    return cachedQuota;
}

export async function consumeAssistActionQuota(settings?: AssistSettings): Promise<boolean> {
    const resolved = settings ?? (await loadAssistSettings());
    await loadAssistQuota();
    if (cachedQuota.used >= resolved.dailyActionQuota) return false;
    cachedQuota = { date: todayKey(), used: cachedQuota.used + 1 };
    await chrome.storage.local.set({ [QUOTA_STORAGE_KEY]: cachedQuota });
    return true;
}

/** @internal tests */
export function resetAssistQuotaForTests(state: AssistQuotaState): void {
    cachedQuota = state;
}
