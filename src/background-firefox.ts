/**
 * Firefox Background Runtime Host
 *
 * Runs inference directly in the background script since Firefox
 * does not support offscreen documents like Chrome.
 */

import type { CoreIpcMessage } from './core/ipc/messages';
import {
    registerAuthenticityBackgroundHandlers,
} from './background-authenticity';
import { registerAssistBackgroundHandlers } from './assist/background-assist';
import { installAssistContextMenus } from './assist/install-assist-menus';
import { ensureInlineRuntimeHost } from './core/runtime/runtime-host-bootstrap';
import { installRoutingLoader } from './core/runtime/routing-settings';

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

    void ensureInlineRuntimeHost()
        .then((host) => host.handleMessage(message))
        .then(sendResponse)
        .catch((error: unknown) => {
            const errorString = error instanceof Error ? error.message : String(error);
            sendResponse({ type: 'error', error: errorString });
        });
    return true;
}

chrome.runtime.onMessage.addListener(handleMessage);

installRoutingLoader();
installAssistContextMenus();
registerAssistBackgroundHandlers();
registerAuthenticityBackgroundHandlers();

chrome.runtime.onInstalled.addListener((details) => {
    installAssistContextMenus();
    if (details.reason !== 'install') return;

    chrome.storage.local.get('onboardingComplete', (result: unknown) => {
        const record = result as { readonly onboardingComplete?: boolean };
        if (record.onboardingComplete) return;

        const wizardUrl = chrome.runtime.getURL('options.html?wizard=1');
        void chrome.tabs.create({ url: wizardUrl });
    });
});

console.log('[Core] Firefox inference runtime host loaded');

export {};
