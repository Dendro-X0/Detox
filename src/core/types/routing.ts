export type PrimaryProviderMode = 'heuristic' | 'local-pack';

export type RemoteApiSettings = {
    readonly enabled: boolean;
    readonly endpointUrl: string;
    readonly apiKey: string;
};

export type InferenceRoutingSettings = {
    readonly primaryMode: PrimaryProviderMode;
    readonly escalationEnabled: boolean;
    /** Scores within threshold ± margin are sent to the remote provider when escalation is on. */
    readonly uncertaintyMargin: number;
    readonly remoteApi: RemoteApiSettings;
};

export const DEFAULT_UNCERTAINTY_MARGIN = 0.1;

export const DEFAULT_ROUTING_SETTINGS: InferenceRoutingSettings = {
    primaryMode: 'heuristic',
    escalationEnabled: false,
    uncertaintyMargin: DEFAULT_UNCERTAINTY_MARGIN,
    remoteApi: {
        enabled: false,
        endpointUrl: '',
        apiKey: '',
    },
};

export function isRemoteApiConfigured(remoteApi: RemoteApiSettings): boolean {
    return remoteApi.enabled && remoteApi.endpointUrl.trim().length > 0;
}

export type InferenceRoutingStorageRecord = {
    readonly inferenceRouting?: InferenceRoutingSettings;
};
