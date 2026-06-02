import {
    DEFAULT_ROUTING_SETTINGS,
    type InferenceRoutingSettings,
    type InferenceRoutingStorageRecord,
} from '../types/routing';

let cachedRouting: InferenceRoutingSettings = DEFAULT_ROUTING_SETTINGS;

export function getRoutingSettings(): InferenceRoutingSettings {
    return cachedRouting;
}

export async function loadRoutingSettings(): Promise<InferenceRoutingSettings> {
    const result = await chrome.storage.local.get('inferenceRouting');
    const record = result as InferenceRoutingStorageRecord;
    if (record.inferenceRouting) {
        cachedRouting = mergeRoutingDefaults(record.inferenceRouting);
    } else {
        cachedRouting = DEFAULT_ROUTING_SETTINGS;
    }
    return cachedRouting;
}

export function subscribeToRoutingChanges(onChange: (settings: InferenceRoutingSettings) => void): void {
    chrome.storage.onChanged.addListener((changes) => {
        if (changes.inferenceRouting) {
            const next = changes.inferenceRouting.newValue as InferenceRoutingSettings | undefined;
            if (next) {
                cachedRouting = mergeRoutingDefaults(next);
                onChange(cachedRouting);
            }
        }
    });
}

export function installRoutingLoader(): void {
    void loadRoutingSettings();
    subscribeToRoutingChanges(() => {
        // Reads via getRoutingSettings() stay fresh.
    });
}

function mergeRoutingDefaults(partial: InferenceRoutingSettings): InferenceRoutingSettings {
    const merged: InferenceRoutingSettings = {
        primaryMode: partial.primaryMode ?? DEFAULT_ROUTING_SETTINGS.primaryMode,
        escalationEnabled: partial.escalationEnabled ?? DEFAULT_ROUTING_SETTINGS.escalationEnabled,
        uncertaintyMargin: partial.uncertaintyMargin ?? DEFAULT_ROUTING_SETTINGS.uncertaintyMargin,
        remoteApi: {
            enabled: partial.remoteApi?.enabled ?? DEFAULT_ROUTING_SETTINGS.remoteApi.enabled,
            endpointUrl: partial.remoteApi?.endpointUrl ?? DEFAULT_ROUTING_SETTINGS.remoteApi.endpointUrl,
            apiKey: partial.remoteApi?.apiKey ?? DEFAULT_ROUTING_SETTINGS.remoteApi.apiKey,
        },
    };

    return normalizeRoutingForBuildProfile(merged);
}

function normalizeRoutingForBuildProfile(settings: InferenceRoutingSettings): InferenceRoutingSettings {
    if (import.meta.env.VITE_BUILD_PROFILE === 'full') return settings;

    return {
        ...settings,
        primaryMode: 'heuristic',
        escalationEnabled: false,
        remoteApi: DEFAULT_ROUTING_SETTINGS.remoteApi,
    };
}
