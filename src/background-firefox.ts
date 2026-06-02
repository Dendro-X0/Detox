/**
 * Firefox Background Runtime Host
 *
 * Runs inference directly in the background script since Firefox
 * does not support offscreen documents like Chrome.
 */

import type { CoreIpcMessage } from './core/ipc/messages';
import { InferenceRuntimeHost } from './core/runtime/inference-runtime-host';
import {
    installAuthenticityContextMenu,
    registerAuthenticityBackgroundHandlers,
} from './background-authenticity';
import { subscribeToEnabledModChanges } from './core/mods/mod-enablement-store';
import { loadBuiltinMods } from './mods/load-builtin-mods';

let runtimeHost: InferenceRuntimeHost | null = null;
let bootstrapPromise: Promise<InferenceRuntimeHost> | null = null;

async function ensureRuntimeHost(): Promise<InferenceRuntimeHost> {
    if (runtimeHost) return runtimeHost;
    if (!bootstrapPromise) {
        bootstrapPromise = (async () => {
            await loadBuiltinMods();
            subscribeToEnabledModChanges(() => {
                void loadBuiltinMods();
            });
            runtimeHost = new InferenceRuntimeHost();
            void runtimeHost.ensureInitialized();
            return runtimeHost;
        })();
    }
    return bootstrapPromise;
}

function isCoreIpcMessage(value: unknown): value is CoreIpcMessage {
    return typeof value === 'object' && value !== null && 'type' in value;
}

function handleMessage(
    message: unknown,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: CoreIpcMessage) => void
): boolean {
    if (!isCoreIpcMessage(message)) return false;
    if (message.type !== 'classifyBatch' && message.type !== 'runtimeStatus') return false;

    void ensureRuntimeHost()
        .then((host) => host.handleMessage(message))
        .then(sendResponse)
        .catch((error: unknown) => {
            const errorString = error instanceof Error ? error.message : String(error);
            sendResponse({ type: 'error', error: errorString });
        });
    return true;
}

chrome.runtime.onMessage.addListener(handleMessage);

installAuthenticityContextMenu();
registerAuthenticityBackgroundHandlers();

chrome.runtime.onInstalled.addListener(() => {
    installAuthenticityContextMenu();
});

console.log('[Core] Firefox inference runtime host loaded');

export {};
