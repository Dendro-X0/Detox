import type { RemoteApiSettings } from '../../../core/types/routing';
import { DEFAULT_ROUTING_SETTINGS } from '../../../core/types/routing';

let cachedRemoteApi: RemoteApiSettings = DEFAULT_ROUTING_SETTINGS.remoteApi;

export function getCachedRemoteApiSettings(): RemoteApiSettings {
    return cachedRemoteApi;
}

export function refreshRemoteApiCache(settings: RemoteApiSettings): void {
    cachedRemoteApi = settings;
}

export type RemoteClassifyRequestBody = {
    readonly items: readonly { readonly id: string; readonly text: string }[];
    readonly threshold?: number;
};

export type RemoteClassifyResponseBody = {
    readonly results?: readonly {
        readonly id: string;
        readonly matched: boolean;
        readonly score: number;
        readonly labelId: string;
        readonly detectorId?: string;
    }[];
};

export async function fetchRemoteClassification(
    settings: RemoteApiSettings,
    body: RemoteClassifyRequestBody
): Promise<RemoteClassifyResponseBody> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (settings.apiKey.trim().length > 0) {
        headers.Authorization = `Bearer ${settings.apiKey.trim()}`;
    }

    const response = await fetch(settings.endpointUrl.trim(), {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        throw new Error(`Remote API HTTP ${response.status}`);
    }

    return await response.json() as RemoteClassifyResponseBody;
}
