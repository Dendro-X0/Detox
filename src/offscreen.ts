import type { DetoxIpcMessage } from './v2/core/detox-ipc';
import * as ort from 'onnxruntime-web';
import { AutoTokenizer, env } from '@xenova/transformers';

type OffscreenRequest = {
    readonly requestId: string;
    readonly payload: DetoxIpcMessage;
};

type OffscreenResponse = {
    readonly requestId: string;
    readonly payload: DetoxIpcMessage;
};

type ClassifyBatchItem = {
    readonly id: string;
    readonly text: string;
};

type ClassifyBatchResult = {
    readonly id: string;
    readonly isToxic: boolean;
    readonly score: number;
    readonly label: string;
};

type RuntimeState = 'uninitialized' | 'loading' | 'ready' | 'error';

type ModelPack = {
    readonly id: string;
    readonly artifacts: {
        readonly modelPath: string;
        readonly tokenizerJsonPath?: string;
        readonly sentencePieceModelPath?: string;
        readonly configPath?: string;
    };
};

type TransformersTensor = {
    readonly data: Int32Array | BigInt64Array | readonly number[];
    readonly dims: readonly number[];
};

type TokenizerEncodeResult = {
    readonly input_ids: TransformersTensor;
    readonly attention_mask: TransformersTensor;
};

type Tokenizer = {
    readonly encode: (text: string) => Promise<TokenizerEncodeResult>;
};

type ModelConfig = {
    readonly id2label?: Record<string, string>;
    readonly label2id?: Record<string, number>;
};

const TOXIC_LABEL: string = 'toxic';
const DEFAULT_THRESHOLD: number = 0.9;
const TOXIC_KEYWORDS: readonly string[] = ['kill', 'kys', 'die', 'stupid', 'idiot', 'moron'] as const;

const toLowerSafe = (value: string): string => value.toLowerCase();

function classifyWithHeuristic(text: string, threshold: number): { readonly isToxic: boolean; readonly score: number; readonly label: string } {
    const normalized = toLowerSafe(text);
    const matches = TOXIC_KEYWORDS.filter((kw) => normalized.includes(kw)).length;
    if (matches <= 0) return { isToxic: false, score: 0, label: TOXIC_LABEL };
    const score = Math.min(1, 0.35 + matches * 0.25);
    return { isToxic: score >= threshold, score, label: TOXIC_LABEL };
}

function isDetoxIpcMessage(value: unknown): value is DetoxIpcMessage {
    return typeof value === 'object' && value !== null && 'type' in value;
}

let runtimeState: RuntimeState = 'uninitialized';
let lastError: string | null = null;
let activePackId: string | null = null;
let session: ort.InferenceSession | null = null;
let tokenizer: Tokenizer | null = null;
let tokenizerLoadPromise: Promise<void> | null = null;
let toxicLabelIndex: number | null = null;

const DEFAULT_PACK_URL: string = 'model-packs/toxicity-multi-xlm-r/modelpack.json';

const DEFAULT_MAX_LENGTH: number = 128;

function configureOrtWasmPaths(): void {
    const wasmBaseUrl = chrome.runtime.getURL('ort/');
    ort.env.wasm.wasmPaths = wasmBaseUrl;
}

/** Check if WebGPU is available and supported */
function isWebGPUSupported(): boolean {
    if (typeof navigator === 'undefined') return false;
    if (!('gpu' in navigator)) return false;
    // WebGPU is supported; we'll try to use it
    return true;
}

/** Get ONNX execution providers based on hardware support */
function getExecutionProviders(): string[] {
    const providers: string[] = [];
    
    // Try WebGPU first (fastest for supported GPUs)
    if (isWebGPUSupported()) {
        providers.push('webgpu');
    }
    
    // Fallback to WebAssembly (always available)
    providers.push('wasm');
    
    return providers;
}

/** Log execution provider info */
function logExecutionProvider(session: ort.InferenceSession): void {
    try {
        // @ts-expect-error - internal property access
        const ep = session.handler?.endProfiling?.() ?? 'unknown';
        console.log('[Detox] Using execution provider:', ep);
    } catch {
        console.log('[Detox] Execution provider: wasm (default)');
    }
}

function toBigInt64Array(values: Int32Array | BigInt64Array | readonly number[]): BigInt64Array {
    if (values instanceof BigInt64Array) return values;
    const asNumbers = values instanceof Int32Array ? Array.from(values) : values;
    const out = new BigInt64Array(asNumbers.length);
    for (let i = 0; i < asNumbers.length; i += 1) out[i] = BigInt(asNumbers[i] ?? 0);
    return out;
}

function isTransformersTensor(value: unknown): value is TransformersTensor {
    if (typeof value !== 'object' || value === null) return false;
    const record = value as { readonly data?: unknown; readonly dims?: unknown };
    if (!('data' in record) || !('dims' in record)) return false;
    const dims = record.dims;
    return Array.isArray(dims) && dims.every((d) => typeof d === 'number');
}

function isTokenizerEncodeResult(value: unknown): value is TokenizerEncodeResult {
    if (typeof value !== 'object' || value === null) return false;
    const record = value as { readonly input_ids?: unknown; readonly attention_mask?: unknown };
    return isTransformersTensor(record.input_ids) && isTransformersTensor(record.attention_mask);
}

async function ensureTokenizerLoaded(packId: string): Promise<void> {
    if (tokenizer !== null) return;
    if (tokenizerLoadPromise !== null) return tokenizerLoadPromise;
    tokenizerLoadPromise = (async () => {
        env.allowRemoteModels = false;
        env.allowLocalModels = true;
        env.localModelPath = chrome.runtime.getURL('model-packs/');
        const raw = await AutoTokenizer.from_pretrained(packId);
        const encode = async (text: string): Promise<TokenizerEncodeResult> => {
            const encodedUnknown = await raw(text, { padding: true, truncation: true, max_length: DEFAULT_MAX_LENGTH });
            if (!isTokenizerEncodeResult(encodedUnknown)) throw new Error('Tokenizer returned unsupported encoding shape');
            return encodedUnknown;
        };
        tokenizer = { encode };
    })();
    return tokenizerLoadPromise;
}

function sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
}

function softmax2(logits0: number, logits1: number): { readonly p0: number; readonly p1: number } {
    const max = Math.max(logits0, logits1);
    const e0 = Math.exp(logits0 - max);
    const e1 = Math.exp(logits1 - max);
    const sum = e0 + e1;
    return { p0: e0 / sum, p1: e1 / sum };
}

async function loadModelPack(): Promise<void> {
    if (runtimeState === 'loading' || runtimeState === 'ready') return;
    runtimeState = 'loading';
    lastError = null;
    activePackId = null;
    try {
        configureOrtWasmPaths();
        const preferredResult = await chrome.storage.local.get('preferredPackId');
        const preferredPackIdUnknown = (preferredResult as { readonly preferredPackId?: unknown }).preferredPackId;
        const preferredPackId = typeof preferredPackIdUnknown === 'string' ? preferredPackIdUnknown : null;
        const preferredPackUrl = preferredPackId ? `model-packs/${preferredPackId}/modelpack.json` : null;
        const packUrl = chrome.runtime.getURL(preferredPackUrl ?? DEFAULT_PACK_URL);
        let packResponse: Response;
        try {
            packResponse = await fetch(packUrl);
        } catch (error: unknown) {
            const errorString = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
            throw new Error(`Failed to fetch modelpack.json (${packUrl}): ${errorString}`);
        }
        if (!packResponse.ok) throw new Error(`Failed to load modelpack.json (${packUrl}): HTTP ${packResponse.status}`);
        const pack = await packResponse.json() as ModelPack;
        activePackId = pack.id;
        await ensureTokenizerLoaded(pack.id);
        toxicLabelIndex = null;
        if (pack.artifacts.configPath) {
            const configUrl = chrome.runtime.getURL(pack.artifacts.configPath);
            try {
                const configResponse = await fetch(configUrl);
                if (configResponse.ok) {
                    const config = await configResponse.json() as ModelConfig;
                    const label2id = config.label2id;
                    if (label2id && typeof label2id[TOXIC_LABEL] === 'number') {
                        toxicLabelIndex = label2id[TOXIC_LABEL];
                    } else if (config.id2label) {
                        for (const [k, v] of Object.entries(config.id2label)) {
                            if (v === TOXIC_LABEL) {
                                const parsed = Number(k);
                                if (Number.isFinite(parsed)) toxicLabelIndex = parsed;
                            }
                        }
                    }
                }
            } catch {
                toxicLabelIndex = null;
            }
        }
        const modelUrl = chrome.runtime.getURL(pack.artifacts.modelPath);
        let modelResponse: Response;
        try {
            modelResponse = await fetch(modelUrl);
        } catch (error: unknown) {
            const errorString = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
            throw new Error(`Failed to fetch model.onnx (${modelUrl}): ${errorString}`);
        }
        if (!modelResponse.ok) throw new Error(`Failed to load model.onnx (${modelUrl}): HTTP ${modelResponse.status}`);
        const modelBuffer = await modelResponse.arrayBuffer();
        
        // Configure session options with WebGPU support
        const executionProviders = getExecutionProviders();
        console.log('[Detox] Attempting to use execution providers:', executionProviders);
        
        try {
            session = await ort.InferenceSession.create(modelBuffer, {
                executionProviders: executionProviders as unknown as string[],
            });
            logExecutionProvider(session);
        } catch (epError: unknown) {
            // If WebGPU fails, fall back to WASM-only
            console.warn('[Detox] WebGPU initialization failed, falling back to WASM:', epError);
            session = await ort.InferenceSession.create(modelBuffer, {
                executionProviders: ['wasm'],
            });
            console.log('[Detox] Using execution provider: wasm (fallback)');
        }
        
        runtimeState = 'ready';
    } catch (error: unknown) {
        const errorString = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
        runtimeState = 'error';
        lastError = errorString;
        session = null;
        tokenizer = null;
        tokenizerLoadPromise = null;
    }
}

function runtimeStatus(): DetoxIpcMessage {
    return { type: 'runtimeStatusResult', state: runtimeState, lastError, activePackId, hasSession: session !== null };
}

function isOffscreenRequest(value: unknown): value is OffscreenRequest {
    if (typeof value !== 'object' || value === null) return false;
    if (!('requestId' in value) || !('payload' in value)) return false;
    const requestId = (value as { requestId?: unknown }).requestId;
    const payload = (value as { payload?: unknown }).payload;
    return typeof requestId === 'string' && isDetoxIpcMessage(payload);
}

async function classifyWithOnnx(text: string, threshold: number): Promise<{ readonly isToxic: boolean; readonly score: number; readonly label: string }> {
    if (session === null || activePackId === null) return classifyWithHeuristic(text, threshold);
    await ensureTokenizerLoaded(activePackId);
    if (tokenizer === null) return classifyWithHeuristic(text, threshold);
    const encoded = await tokenizer.encode(text);
    const ids = toBigInt64Array(encoded.input_ids.data);
    const mask = toBigInt64Array(encoded.attention_mask.data);
    const dims = encoded.input_ids.dims;
    const inputIds = new ort.Tensor('int64', ids, [...dims]);
    const attentionMask = new ort.Tensor('int64', mask, [...dims]);
    const outputs = await session.run({ input_ids: inputIds, attention_mask: attentionMask });
    const first = Object.values(outputs)[0];
    if (!first || !(first.data instanceof Float32Array)) return classifyWithHeuristic(text, threshold);
    const data = first.data;
    if (data.length === 1) {
        const score = sigmoid(data[0] ?? 0);
        return { isToxic: score >= threshold, score, label: TOXIC_LABEL };
    }
    if (data.length === 2) {
        const probs = softmax2(data[0] ?? 0, data[1] ?? 0);
        const score = probs.p1;
        return { isToxic: score >= threshold, score, label: TOXIC_LABEL };
    }
    if (data.length > 2) {
        const index = toxicLabelIndex ?? 0;
        const logit = data[index] ?? data[0] ?? 0;
        const score = sigmoid(logit);
        return { isToxic: score >= threshold, score, label: TOXIC_LABEL };
    }
    return classifyWithHeuristic(text, threshold);
}

async function handleMessage(message: DetoxIpcMessage): Promise<DetoxIpcMessage> {
    if (message.type === 'runtimeStatus') {
        if (runtimeState === 'uninitialized') void loadModelPack();
        return runtimeStatus();
    }
    if (message.type !== 'classifyBatch') return { type: 'error', error: 'Unsupported message type' };
    if (runtimeState === 'uninitialized') void loadModelPack();
    const items = message.items as readonly ClassifyBatchItem[];
    const threshold = message.threshold ?? DEFAULT_THRESHOLD;
    const results: readonly ClassifyBatchResult[] = await Promise.all(items.map(async (item) => {
        try {
            const verdict = runtimeState === 'ready' ? await classifyWithOnnx(item.text, threshold) : classifyWithHeuristic(item.text, threshold);
            return { id: item.id, isToxic: verdict.isToxic, score: verdict.score, label: verdict.label };
        } catch (error: unknown) {
            const errorString = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
            lastError = errorString;
            return { id: item.id, isToxic: false, score: 0, label: TOXIC_LABEL };
        }
    }));
    return { type: 'classifyBatchResult', results };
}

chrome.runtime.onConnect.addListener((port: chrome.runtime.Port) => {
    if (port.name !== 'detox-offscreen') return;
    port.onMessage.addListener((raw: unknown) => {
        if (!isOffscreenRequest(raw)) {
            const response: OffscreenResponse = { requestId: 'unknown', payload: { type: 'error', error: 'Invalid request' } };
            port.postMessage(response);
            return;
        }
        void handleMessage(raw.payload).then((payload) => {
            const response: OffscreenResponse = { requestId: raw.requestId, payload };
            port.postMessage(response);
        }).catch((error: unknown) => {
            const errorString = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
            const response: OffscreenResponse = { requestId: raw.requestId, payload: { type: 'error', error: errorString } };
            port.postMessage(response);
        });
    });
});

console.log('Detox AI: Offscreen runtime loaded');
