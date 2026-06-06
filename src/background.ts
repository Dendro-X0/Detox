import type { CoreIpcMessage } from './core/ipc/messages';
import {
    OFFSCREEN_PORT_NAME,
    OFFSCREEN_REQUEST_ID_PREFIX,
} from './core/runtime/constants';
import {
    installAuthenticityContextMenu,
    registerAuthenticityBackgroundHandlers,
} from './background-authenticity';
import { installRoutingLoader } from './core/runtime/routing-settings';
import {
    ensureInlineRuntimeHost,
    needsOffscreenRuntime,
} from './core/runtime/runtime-host-bootstrap';

type ClassifyMessage = {
    readonly type: 'classify';
    readonly id: string;
    readonly text: string;
};

type ResultResponse = {
    readonly type: 'result';
    readonly id: string;
    readonly isToxic: boolean;
    readonly score: number;
};

type ErrorResponse = {
    readonly type: 'error';
    readonly error: string;
};

type ClassifyResponse = ResultResponse | ErrorResponse;

type OffscreenRequest = {
    readonly requestId: string;
    readonly payload: CoreIpcMessage;
};

type OffscreenResponse = {
    readonly requestId: string;
    readonly payload: CoreIpcMessage;
};

const OFFSCREEN_PAGE: string = 'offscreen.html';
const REQUEST_ID_RANDOM_BASE: number = 36;

let offscreenPort: chrome.runtime.Port | null = null;
let pendingOffscreenRequests = new Map<string, (message: CoreIpcMessage) => void>();

function createRequestId(): string {
    const uuid = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(REQUEST_ID_RANDOM_BASE).slice(2);
    return `${OFFSCREEN_REQUEST_ID_PREFIX}${uuid}`;
}

function isOffscreenResponse(value: unknown): value is OffscreenResponse {
    if (typeof value !== 'object' || value === null) return false;
    if (!('requestId' in value) || !('payload' in value)) return false;
    const requestId = (value as { requestId?: unknown }).requestId;
    const payload = (value as { payload?: unknown }).payload;
    return typeof requestId === 'string' && isCoreIpcMessage(payload);
}

function connectOffscreenPort(): chrome.runtime.Port {
    if (offscreenPort) return offscreenPort;
    const port = chrome.runtime.connect({ name: OFFSCREEN_PORT_NAME });
    port.onMessage.addListener((raw: unknown) => {
        if (!isOffscreenResponse(raw)) return;
        const resolve = pendingOffscreenRequests.get(raw.requestId);
        if (!resolve) return;
        pendingOffscreenRequests.delete(raw.requestId);
        resolve(raw.payload);
    });
    port.onDisconnect.addListener(() => {
        offscreenPort = null;
        pendingOffscreenRequests = new Map<string, (message: CoreIpcMessage) => void>();
    });
    offscreenPort = port;
    return port;
}

async function ensureOffscreenDocument(): Promise<void> {
    const hasDocument = await chrome.offscreen.hasDocument();
    if (hasDocument) return;
    await chrome.offscreen.createDocument({
        url: OFFSCREEN_PAGE,
        reasons: [chrome.offscreen.Reason.IFRAME_SCRIPTING],
        justification: 'Run local ML inference in a stable extension context'
    });
}

async function requestOffscreen(payload: CoreIpcMessage): Promise<CoreIpcMessage> {
    await ensureOffscreenDocument();
    const requestId = createRequestId();
    const request: OffscreenRequest = { requestId, payload };
    const port = connectOffscreenPort();
    const response = await new Promise<CoreIpcMessage>((resolve) => {
        pendingOffscreenRequests.set(requestId, resolve);
        port.postMessage(request);
    });
    return response;
}

function isCoreIpcMessage(value: unknown): value is CoreIpcMessage {
    return typeof value === 'object' && value !== null && 'type' in value;
}

function isClassifyBatchMessage(message: CoreIpcMessage): message is Extract<CoreIpcMessage, { readonly type: 'classifyBatch' }> {
    return message.type === 'classifyBatch';
}

function isRuntimeStatusMessage(message: CoreIpcMessage): message is Extract<CoreIpcMessage, { readonly type: 'runtimeStatus' }> {
    return message.type === 'runtimeStatus';
}

console.log('SignalLens: Background Service Worker Loaded');

installRoutingLoader();
installAuthenticityContextMenu();
registerAuthenticityBackgroundHandlers();

chrome.runtime.onInstalled.addListener((details) => {
    installAuthenticityContextMenu();
    if (details.reason !== 'install') return;

    chrome.storage.local.get('onboardingComplete', (result: unknown) => {
        const record = result as { readonly onboardingComplete?: boolean };
        if (record.onboardingComplete) return;

        const wizardUrl = chrome.runtime.getURL('options.html?wizard=1');
        void chrome.tabs.create({ url: wizardUrl });
    });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (typeof message === 'object' && message !== null && (message as { type?: unknown }).type === 'classify') {
        classifyText(message as ClassifyMessage, sendResponse as (response: ClassifyResponse) => void);
        return true;
    }
    if (!isCoreIpcMessage(message)) return false;
    if (isClassifyBatchMessage(message)) {
        console.log('Detox AI: Received classifyBatch', {
            count: message.items.length,
            threshold: message.threshold,
        });
        classifyBatch(message, sendResponse as (response: CoreIpcMessage) => void);
        return true;
    }
    if (isRuntimeStatusMessage(message)) {
        runtimeStatus(sendResponse as (response: CoreIpcMessage) => void);
        return true;
    }
    return false;
});

function classifyBatch(
    message: Extract<CoreIpcMessage, { type: 'classifyBatch' }>,
    sendResponse: (response: CoreIpcMessage) => void
): void {
    void dispatchRuntimeMessage(message).then((response) => {
        if (response.type === 'error') {
            console.warn('Detox AI: Classification error', response.error);
        }
        if (response.type === 'classifyBatchResult') {
            console.log('Detox AI: Sending classifyBatchResult', { count: response.results.length });
        }
        sendResponse(response);
    }).catch((error: unknown) => {
        const errorString = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
        console.error('Detox AI: classifyBatch failed', error);
        sendResponse({ type: 'error', error: errorString });
    });
}

function runtimeStatus(sendResponse: (response: CoreIpcMessage) => void): void {
    const payload: CoreIpcMessage = { type: 'runtimeStatus' };
    void dispatchRuntimeMessage(payload).then(sendResponse).catch((error: unknown) => {
        const errorString = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
        sendResponse({ type: 'error', error: errorString });
    });
}

async function dispatchRuntimeMessage(payload: CoreIpcMessage): Promise<CoreIpcMessage> {
    if (await needsOffscreenRuntime()) {
        return requestOffscreen(payload);
    }
    const host = await ensureInlineRuntimeHost();
    return host.handleMessage(payload);
}

function classifyText(_message: ClassifyMessage, sendResponse: (response: ClassifyResponse) => void): void {
    const error = 'Deprecated: single-item classify is disabled in v2; use classifyBatch.';
    sendResponse({ type: 'error', error });
}
