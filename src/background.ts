import type { DetoxIpcMessage } from './v2/core/detox-ipc';

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

type ClassifyBatchItem = {
    readonly id: string;
    readonly text: string;
};

type OffscreenRequest = {
    readonly requestId: string;
    readonly payload: DetoxIpcMessage;
};

type OffscreenResponse = {
    readonly requestId: string;
    readonly payload: DetoxIpcMessage;
};

const OFFSCREEN_PORT_NAME: string = 'detox-offscreen';
const OFFSCREEN_PAGE: string = 'offscreen.html';
const REQUEST_ID_PREFIX: string = 'detox-req-';
const REQUEST_ID_RANDOM_BASE: number = 36;

let offscreenPort: chrome.runtime.Port | null = null;
let pendingOffscreenRequests = new Map<string, (message: DetoxIpcMessage) => void>();

function createRequestId(): string {
    const uuid = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(REQUEST_ID_RANDOM_BASE).slice(2);
    return `${REQUEST_ID_PREFIX}${uuid}`;
}

function isOffscreenResponse(value: unknown): value is OffscreenResponse {
    if (typeof value !== 'object' || value === null) return false;
    if (!('requestId' in value) || !('payload' in value)) return false;
    const requestId = (value as { requestId?: unknown }).requestId;
    const payload = (value as { payload?: unknown }).payload;
    return typeof requestId === 'string' && isDetoxIpcMessage(payload);
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
        pendingOffscreenRequests = new Map<string, (message: DetoxIpcMessage) => void>();
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

async function requestOffscreen(payload: DetoxIpcMessage): Promise<DetoxIpcMessage> {
    await ensureOffscreenDocument();
    const requestId = createRequestId();
    const request: OffscreenRequest = { requestId, payload };
    const port = connectOffscreenPort();
    const response = await new Promise<DetoxIpcMessage>((resolve) => {
        pendingOffscreenRequests.set(requestId, resolve);
        port.postMessage(request);
    });
    return response;
}

function isDetoxIpcMessage(value: unknown): value is DetoxIpcMessage {
    return typeof value === 'object' && value !== null && 'type' in value;
}

function isClassifyBatchMessage(message: DetoxIpcMessage): message is Extract<DetoxIpcMessage, { readonly type: 'classifyBatch' }> {
    return message.type === 'classifyBatch';
}

function isRuntimeStatusMessage(message: DetoxIpcMessage): message is Extract<DetoxIpcMessage, { readonly type: 'runtimeStatus' }> {
    return message.type === 'runtimeStatus';
}

console.log("Detox AI: Background Service Worker Loaded");

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (typeof message === 'object' && message !== null && (message as { type?: unknown }).type === 'classify') {
        classifyText(message as ClassifyMessage, sendResponse as (response: ClassifyResponse) => void);
        return true;
    }
    if (!isDetoxIpcMessage(message)) return false;
    if (isClassifyBatchMessage(message)) {
        console.log('Detox AI: Received classifyBatch', { count: message.items.length });
        classifyBatch(message.items, sendResponse as (response: DetoxIpcMessage) => void);
        return true;
    }
    if (isRuntimeStatusMessage(message)) {
        runtimeStatus(sendResponse as (response: DetoxIpcMessage) => void);
        return true;
    }
    return false;
});

function classifyBatch(items: readonly ClassifyBatchItem[], sendResponse: (response: DetoxIpcMessage) => void): void {
    const payload: DetoxIpcMessage = { type: 'classifyBatch', items };
    void requestOffscreen(payload).then((message) => {
        if (message.type === 'error') {
            console.warn('Detox AI: Offscreen classification error', message.error);
        }
        if (message.type === 'classifyBatchResult') {
            console.log('Detox AI: Sending classifyBatchResult', { count: message.results.length });
        }
        sendResponse(message);
    }).catch((error: unknown) => {
        const errorString = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
        console.error('Detox AI: Offscreen classifyBatch failed', error);
        sendResponse({ type: 'error', error: errorString });
    });
}

function runtimeStatus(sendResponse: (response: DetoxIpcMessage) => void): void {
    const payload: DetoxIpcMessage = { type: 'runtimeStatus' };
    void requestOffscreen(payload).then((message) => {
        sendResponse(message);
    }).catch((error: unknown) => {
        const errorString = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
        sendResponse({ type: 'error', error: errorString });
    });
}

function classifyText(_message: ClassifyMessage, sendResponse: (response: ClassifyResponse) => void): void {
    const error = 'Deprecated: single-item classify is disabled in v2; use classifyBatch.';
    sendResponse({ type: 'error', error });
}
