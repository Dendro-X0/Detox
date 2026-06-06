import type { CoreIpcMessage } from './core/ipc/messages';
import { OFFSCREEN_PORT_NAME } from './core/runtime/constants';
import { InferenceRuntimeHost } from './core/runtime/inference-runtime-host';
import { subscribeToEnabledModChanges } from './core/mods/mod-enablement-store';
import { loadBuiltinMods } from './mods/load-builtin-mods';

type OffscreenRequest = {
    readonly requestId: string;
    readonly payload: CoreIpcMessage;
};

type OffscreenResponse = {
    readonly requestId: string;
    readonly payload: CoreIpcMessage;
};


let runtimeHost: InferenceRuntimeHost | null = null;
let bootstrapPromise: Promise<InferenceRuntimeHost> | null = null;

async function ensureRuntimeHost(): Promise<InferenceRuntimeHost> {
    if (runtimeHost) return runtimeHost;
    if (!bootstrapPromise) {
        bootstrapPromise = (async () => {
            await loadBuiltinMods('inference');
            subscribeToEnabledModChanges(() => {
                void loadBuiltinMods('inference');
            });
            runtimeHost = new InferenceRuntimeHost();
            return runtimeHost;
        })();
    }
    return bootstrapPromise;
}

function isCoreIpcMessage(value: unknown): value is CoreIpcMessage {
    return typeof value === 'object' && value !== null && 'type' in value;
}

function isOffscreenRequest(value: unknown): value is OffscreenRequest {
    if (typeof value !== 'object' || value === null) return false;
    if (!('requestId' in value) || !('payload' in value)) return false;
    const requestId = (value as { requestId?: unknown }).requestId;
    const payload = (value as { payload?: unknown }).payload;
    return typeof requestId === 'string' && isCoreIpcMessage(payload);
}

chrome.runtime.onConnect.addListener((port: chrome.runtime.Port) => {
    if (port.name !== OFFSCREEN_PORT_NAME) return;
    port.onMessage.addListener((raw: unknown) => {
        if (!isOffscreenRequest(raw)) {
            const response: OffscreenResponse = {
                requestId: 'unknown',
                payload: { type: 'error', error: 'Invalid request' },
            };
            port.postMessage(response);
            return;
        }
        void ensureRuntimeHost()
            .then((host) => host.handleMessage(raw.payload))
            .then((payload) => {
                const response: OffscreenResponse = { requestId: raw.requestId, payload };
                port.postMessage(response);
            })
            .catch((error: unknown) => {
                const errorString = error instanceof Error ? error.message : String(error);
                const response: OffscreenResponse = {
                    requestId: raw.requestId,
                    payload: { type: 'error', error: errorString },
                };
                port.postMessage(response);
            });
    });
});

console.log('[Core] Offscreen inference runtime host loaded');
