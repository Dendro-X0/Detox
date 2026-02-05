/**
 * Firefox Background Runtime Host
 *
 * Firefox-compatible runtime that runs ONNX inference directly in background script
 * since Firefox doesn't support offscreen documents like Chrome.
 */

import * as ort from 'onnxruntime-web';
import { env, AutoTokenizer } from '@xenova/transformers';

const DEFAULT_PACK_URL = 'model-packs/toxicity-multi-xlm-r/modelpack.json';
const DEFAULT_MAX_LENGTH = 128;

// Runtime state
let runtimeState: 'idle' | 'loading' | 'ready' | 'error' = 'idle';
let lastError: string | null = null;
let activePackId: string | null = null;
let session: ort.InferenceSession | null = null;
let tokenizer: { readonly encode: (text: string) => Promise<TokenizerEncodeResult> } | null = null;
let tokenizerLoadPromise: Promise<void> | null = null;

interface TokenizerEncodeResult {
    readonly input_ids: { readonly data: Int32Array; readonly dims: readonly number[] };
    readonly attention_mask: { readonly data: Int32Array; readonly dims: readonly number[] };
}

interface ModelPack {
    readonly id: string;
    readonly artifacts: { readonly modelPath: string; readonly configPath?: string };
}

function configureOrtWasmPaths(): void {
    ort.env.wasm.wasmPaths = 'ort/';
}

function isWebGPUSupported(): boolean {
    return typeof navigator !== 'undefined' && 'gpu' in navigator;
}

function getExecutionProviders(): string[] {
    return isWebGPUSupported() ? ['webgpu', 'wasm'] : ['wasm'];
}

async function ensureTokenizerLoaded(packId: string): Promise<void> {
    if (tokenizer !== null) return;
    if (tokenizerLoadPromise !== null) return tokenizerLoadPromise;

    tokenizerLoadPromise = (async () => {
        env.allowRemoteModels = false;
        env.allowLocalModels = true;
        env.localModelPath = 'model-packs/';
        const raw = await AutoTokenizer.from_pretrained(packId);
        tokenizer = {
            encode: async (text: string) => {
                const result = await raw(text, { padding: true, truncation: true, max_length: DEFAULT_MAX_LENGTH });
                return result as unknown as TokenizerEncodeResult;
            }
        };
    })();
    return tokenizerLoadPromise;
}

function sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
}

async function loadModelPack(): Promise<void> {
    if (runtimeState === 'loading' || runtimeState === 'ready') return;
    runtimeState = 'loading';
    lastError = null;

    try {
        configureOrtWasmPaths();
        const preferredResult = await chrome.storage.local.get('preferredPackId');
        const preferredPackIdUnknown = (preferredResult as { readonly preferredPackId?: unknown }).preferredPackId;
        const preferredPackId = typeof preferredPackIdUnknown === 'string' ? preferredPackIdUnknown : null;
        const packUrl = preferredPackId ? `model-packs/${preferredPackId}/modelpack.json` : DEFAULT_PACK_URL;
        const packResponse = await fetch(packUrl);
        if (!packResponse.ok) throw new Error('Failed to load modelpack.json');
        const pack = await packResponse.json() as ModelPack;
        activePackId = pack.id;
        await ensureTokenizerLoaded(pack.id);

        const modelResponse = await fetch(pack.artifacts.modelPath);
        if (!modelResponse.ok) throw new Error('Failed to load model.onnx');
        const modelBuffer = await modelResponse.arrayBuffer();

        const executionProviders = getExecutionProviders();
        try {
            session = await ort.InferenceSession.create(modelBuffer, {
                executionProviders: executionProviders as unknown as string[],
            });
        } catch {
            session = await ort.InferenceSession.create(modelBuffer, { executionProviders: ['wasm'] });
        }
        runtimeState = 'ready';
    } catch (error) {
        runtimeState = 'error';
        lastError = error instanceof Error ? error.message : String(error);
        session = null;
        tokenizer = null;
    }
}

async function classifyWithOnnx(text: string, threshold: number): Promise<{ label: string; score: number }> {
    if (!tokenizer || !session) throw new Error('Model not loaded');

    const encoded = await tokenizer.encode(text);
    const inputIds = encoded.input_ids.data;
    const attentionMask = encoded.attention_mask.data;
    const seqLen = encoded.input_ids.dims[1];

    const inputIdsTensor = new ort.Tensor('int32', inputIds, [1, seqLen]);
    const attentionMaskTensor = new ort.Tensor('int32', attentionMask, [1, seqLen]);

    const feeds: Record<string, ort.Tensor> = {
        input_ids: inputIdsTensor,
        attention_mask: attentionMaskTensor,
    };

    const results = await session.run(feeds);
    const outputName = Object.keys(results)[0];
    const logits = results[outputName].data as Float32Array;

    let score: number;
    if (logits.length === 2) {
        score = sigmoid(logits[1] - logits[0]);
    } else if (logits.length === 1) {
        score = sigmoid(logits[0]);
    } else {
        const toxicIdx = 1;
        score = sigmoid(logits[toxicIdx]);
    }

    const isToxic = score > threshold;
    return {
        label: isToxic ? 'toxic' : 'safe',
        score,
    };
}

function handleMessage(message: unknown, _sender: chrome.runtime.MessageSender, sendResponse: (response: unknown) => void): boolean {
    const msg = message as { type?: string };

    if (msg.type === 'classifyBatch') {
        const batchMsg = message as { texts: readonly string[]; threshold: number };
        const texts = batchMsg.texts ?? [];
        const threshold = batchMsg.threshold ?? 0.5;

        if (runtimeState === 'idle') {
            loadModelPack().then(() => {
                processBatch(texts, threshold, sendResponse);
            });
        } else if (runtimeState === 'ready') {
            processBatch(texts, threshold, sendResponse);
        } else {
            sendResponse({ error: `Runtime not ready: ${runtimeState}` });
        }
        return true;
    }

    if (msg.type === 'runtimeStatus') {
        sendResponse({
            type: 'runtimeStatusResult',
            state: runtimeState,
            lastError,
            activePackId,
            hasSession: session !== null,
        });
        return false;
    }

    return false;
}

async function processBatch(texts: readonly string[], threshold: number, sendResponse: (response: unknown) => void): Promise<void> {
    const results: { label: string; score: number }[] = [];

    for (const text of texts) {
        try {
            const result = await classifyWithOnnx(text, threshold);
            results.push(result);
        } catch {
            results.push({ label: 'safe', score: 0 });
        }
    }

    sendResponse({ results });
}

// Initialize
chrome.runtime.onMessage.addListener(handleMessage);
loadModelPack();

export {};
