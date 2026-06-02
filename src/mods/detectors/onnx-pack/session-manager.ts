import * as ort from 'onnxruntime-web';
import { AutoTokenizer, env } from '@xenova/transformers';
import type { ProviderRuntimeInfo } from '../../../core/types/detector';
import type { Verdict } from '../../../core/types/verdict';
import {
    DEFAULT_LABEL_ID,
    HEURISTIC_DETECTOR_ID,
    ONNX_DETECTOR_ID,
} from '../constants';

type ModelPack = {
    readonly id: string;
    readonly artifacts: {
        readonly modelPath: string;
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

const DEFAULT_PACK_PATH = 'model-packs/toxicity-multi-xlm-r/modelpack.json';
const DEFAULT_MAX_LENGTH = 128;
const LEGACY_POSITIVE_LABEL = 'toxic';

function configureOrtWasmPaths(): void {
    const wasmBaseUrl = chrome.runtime.getURL('ort/');
    ort.env.wasm.wasmPaths = wasmBaseUrl;
}

function isWebGPUSupported(): boolean {
    return typeof navigator !== 'undefined' && 'gpu' in navigator;
}

function getExecutionProviders(): string[] {
    return isWebGPUSupported() ? ['webgpu', 'wasm'] : ['wasm'];
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

export class OnnxSessionManager {
    private state: ProviderRuntimeInfo['state'] = 'idle';
    private lastError: string | null = null;
    private activePackId: string | null = null;
    private session: ort.InferenceSession | null = null;
    private tokenizer: Tokenizer | null = null;
    private tokenizerLoadPromise: Promise<void> | null = null;
    private noiseLabelIndex: number | null = null;
    private initPromise: Promise<void> | null = null;

    getRuntimeInfo(): ProviderRuntimeInfo {
        return {
            state: this.state,
            activePackId: this.activePackId,
            lastError: this.lastError,
            hasSession: this.session !== null,
        };
    }

    isReady(): boolean {
        return this.state === 'ready' && this.session !== null;
    }

    async initialize(): Promise<void> {
        if (this.state === 'ready') return;
        if (this.initPromise !== null) return this.initPromise;

        this.initPromise = this.loadModelPack();
        try {
            await this.initPromise;
        } finally {
            this.initPromise = null;
        }
    }

    async classify(text: string, threshold: number): Promise<Verdict> {
        if (!this.isReady() || this.activePackId === null) {
            throw new Error('ONNX session is not ready');
        }

        await this.ensureTokenizerLoaded(this.activePackId);
        if (this.tokenizer === null || this.session === null) {
            throw new Error('ONNX tokenizer or session unavailable');
        }

        const encoded = await this.tokenizer.encode(text);
        const ids = toBigInt64Array(encoded.input_ids.data);
        const mask = toBigInt64Array(encoded.attention_mask.data);
        const dims = encoded.input_ids.dims;
        const inputIds = new ort.Tensor('int64', ids, [...dims]);
        const attentionMask = new ort.Tensor('int64', mask, [...dims]);
        const outputs = await this.session.run({ input_ids: inputIds, attention_mask: attentionMask });
        const first = Object.values(outputs)[0];
        if (!first || !(first.data instanceof Float32Array)) {
            throw new Error('Unexpected ONNX output shape');
        }

        const data = first.data;
        let score = 0;
        if (data.length === 1) {
            score = sigmoid(data[0] ?? 0);
        } else if (data.length === 2) {
            const probs = softmax2(data[0] ?? 0, data[1] ?? 0);
            score = probs.p1;
        } else if (data.length > 2) {
            const index = this.noiseLabelIndex ?? 0;
            const logit = data[index] ?? data[0] ?? 0;
            score = sigmoid(logit);
        } else {
            throw new Error('Empty ONNX output');
        }

        return {
            matched: score >= threshold,
            score,
            labelId: DEFAULT_LABEL_ID,
            detectorId: ONNX_DETECTOR_ID,
        };
    }

    private async ensureTokenizerLoaded(packId: string): Promise<void> {
        if (this.tokenizer !== null) return;
        if (this.tokenizerLoadPromise !== null) return this.tokenizerLoadPromise;

        this.tokenizerLoadPromise = (async () => {
            env.allowRemoteModels = false;
            env.allowLocalModels = true;
            env.localModelPath = chrome.runtime.getURL('model-packs/');
            const raw = await AutoTokenizer.from_pretrained(packId);
            const encode = async (text: string): Promise<TokenizerEncodeResult> => {
                const encodedUnknown = await raw(text, {
                    padding: true,
                    truncation: true,
                    max_length: DEFAULT_MAX_LENGTH,
                });
                if (!isTokenizerEncodeResult(encodedUnknown)) {
                    throw new Error('Tokenizer returned unsupported encoding shape');
                }
                return encodedUnknown;
            };
            this.tokenizer = { encode };
        })();
        return this.tokenizerLoadPromise;
    }

    private async loadModelPack(): Promise<void> {
        if (this.state === 'loading' || this.state === 'ready') return;

        this.state = 'loading';
        this.lastError = null;
        this.activePackId = null;

        try {
            configureOrtWasmPaths();
            const preferredResult = await chrome.storage.local.get('preferredPackId');
            const preferredPackIdUnknown = (preferredResult as { readonly preferredPackId?: unknown }).preferredPackId;
            const preferredPackId = typeof preferredPackIdUnknown === 'string' ? preferredPackIdUnknown : null;
            const preferredPackUrl = preferredPackId ? `model-packs/${preferredPackId}/modelpack.json` : null;
            const packUrl = chrome.runtime.getURL(preferredPackUrl ?? DEFAULT_PACK_PATH);

            const packResponse = await fetch(packUrl);
            if (!packResponse.ok) {
                throw new Error(`Failed to load modelpack.json (${packUrl}): HTTP ${packResponse.status}`);
            }

            const pack = await packResponse.json() as ModelPack;
            this.activePackId = pack.id;
            await this.ensureTokenizerLoaded(pack.id);
            this.noiseLabelIndex = null;

            if (pack.artifacts.configPath) {
                const configUrl = chrome.runtime.getURL(pack.artifacts.configPath);
                try {
                    const configResponse = await fetch(configUrl);
                    if (configResponse.ok) {
                        const config = await configResponse.json() as ModelConfig;
                        const label2id = config.label2id;
                        if (label2id && typeof label2id[LEGACY_POSITIVE_LABEL] === 'number') {
                            this.noiseLabelIndex = label2id[LEGACY_POSITIVE_LABEL];
                        } else if (config.id2label) {
                            for (const [k, v] of Object.entries(config.id2label)) {
                                if (v === LEGACY_POSITIVE_LABEL) {
                                    const parsed = Number(k);
                                    if (Number.isFinite(parsed)) this.noiseLabelIndex = parsed;
                                }
                            }
                        }
                    }
                } catch {
                    this.noiseLabelIndex = null;
                }
            }

            const modelUrl = chrome.runtime.getURL(pack.artifacts.modelPath);
            const modelResponse = await fetch(modelUrl);
            if (!modelResponse.ok) {
                throw new Error(`Failed to load model.onnx (${modelUrl}): HTTP ${modelResponse.status}`);
            }

            const modelBuffer = await modelResponse.arrayBuffer();
            const executionProviders = getExecutionProviders();

            try {
                this.session = await ort.InferenceSession.create(modelBuffer, {
                    executionProviders: executionProviders as unknown as string[],
                });
            } catch {
                this.session = await ort.InferenceSession.create(modelBuffer, {
                    executionProviders: ['wasm'],
                });
            }

            this.state = 'ready';
        } catch (error: unknown) {
            const errorString = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
            this.state = 'error';
            this.lastError = errorString;
            this.activePackId = null;
            this.session = null;
            this.tokenizer = null;
            this.tokenizerLoadPromise = null;
        }
    }
}

export function createEmptyVerdict(): Verdict {
    return {
        matched: false,
        score: 0,
        labelId: DEFAULT_LABEL_ID,
        detectorId: HEURISTIC_DETECTOR_ID,
    };
}
