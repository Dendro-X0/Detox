/**
 * Backend Benchmark: WebGPU vs WASM execution providers
 *
 * Compares inference speed, cold/warm start times, memory usage
 * to determine preferred default execution provider.
 */

import * as ort from 'onnxruntime-web';
import { AutoTokenizer, env } from '@xenova/transformers';

export interface ExecutionProviderBenchmark {
    readonly name: string;
    readonly provider: 'webgpu' | 'wasm';
    readonly coldStartMs: number;
    readonly warmStartMs: number;
    readonly avgInferenceMs: number;
    readonly minInferenceMs: number;
    readonly maxInferenceMs: number;
    readonly modelLoadMs: number;
    readonly memoryPeakMb: number;
    readonly available: boolean;
    readonly error?: string;
}

export interface BenchmarkResult {
    readonly timestamp: string;
    readonly userAgent: string;
    readonly platform: string;
    readonly webgpu: ExecutionProviderBenchmark;
    readonly wasm: ExecutionProviderBenchmark;
    readonly winner: 'webgpu' | 'wasm' | 'tie';
    readonly recommendation: string;
}

type TokenizerType = {
    (text: string, options?: Record<string, unknown>): Promise<{
        input_ids: { data: Int32Array | BigInt64Array; dims: number[] };
        attention_mask: { data: Int32Array | BigInt64Array; dims: number[] };
    }>;
};

export class BackendBenchmarkRunner {
    private tokenizer: TokenizerType | null = null;
    private modelBuffer: ArrayBuffer | null = null;

    async initialize(packUrl: string): Promise<void> {
        const response = await fetch(packUrl);
        if (!response.ok) throw new Error(`Failed to load model pack: ${response.status}`);
        const pack = await response.json() as { id: string; artifacts: { modelPath: string } };

        const baseUrl = packUrl.substring(0, packUrl.lastIndexOf('/') + 1);
        const modelUrl = baseUrl + pack.artifacts.modelPath.split('/').pop();
        const modelResponse = await fetch(modelUrl);
        if (!modelResponse.ok) throw new Error(`Failed to load model: ${modelResponse.status}`);
        this.modelBuffer = await modelResponse.arrayBuffer();

        // Configure tokenizer - Transformers.js appends {packId}/tokenizer.json to localModelPath
        // baseUrl is ".../model-packs/toxicity-multi-xlm-r/", so we need parent ".../model-packs/"
        env.allowRemoteModels = false;
        env.allowLocalModels = true;
        const modelPacksUrl = baseUrl.substring(0, baseUrl.lastIndexOf(pack.id));
        env.localModelPath = modelPacksUrl || baseUrl;
        this.tokenizer = await AutoTokenizer.from_pretrained(pack.id) as unknown as TokenizerType;
    }

    async runBenchmarks(): Promise<BenchmarkResult> {
        if (!this.modelBuffer || !this.tokenizer) {
            throw new Error('Benchmark runner not initialized');
        }

        const wasmBaseUrl = typeof chrome !== 'undefined'
            ? chrome.runtime.getURL('ort/')
            : new URL('ort/', location.href).href;
        ort.env.wasm.wasmPaths = wasmBaseUrl;

        const wasmResult = await this.benchmarkProvider('wasm');
        const webgpuResult = await this.benchmarkProvider('webgpu');

        const winner = this.determineWinner(webgpuResult, wasmResult);
        const recommendation = this.generateRecommendation(winner, webgpuResult, wasmResult);

        return {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            webgpu: webgpuResult,
            wasm: wasmResult,
            winner,
            recommendation,
        };
    }

    private async benchmarkProvider(provider: 'webgpu' | 'wasm'): Promise<ExecutionProviderBenchmark> {
        const startTime = performance.now();
        const memoryBefore = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize || 0;

        if (provider === 'webgpu' && !this.isWebGPUSupported()) {
            return {
                name: 'WebGPU',
                provider: 'webgpu',
                coldStartMs: 0, warmStartMs: 0, avgInferenceMs: 0,
                minInferenceMs: 0, maxInferenceMs: 0, modelLoadMs: 0,
                memoryPeakMb: 0, available: false,
                error: 'WebGPU not supported',
            };
        }

        try {
            const loadStart = performance.now();
            const session = await ort.InferenceSession.create(
                this.modelBuffer as ArrayBuffer,
                { executionProviders: [provider] }
            );
            const modelLoadMs = performance.now() - loadStart;

            // Warm-up
            const samples = [...BENCHMARK_SAMPLES];
            for (let i = 0; i < 5; i += 1) {
                const sample = samples[i % samples.length];
                if (sample) await this.runInference(session, sample);
            }

            // Warm start timing
            const warmStartBegin = performance.now();
            const warmSample = samples[0];
            if (warmSample) await this.runInference(session, warmSample);
            const warmStartMs = performance.now() - warmStartBegin;

            // Benchmark runs
            const inferenceTimes: number[] = [];
            const runs = 20;
            for (let i = 0; i < runs; i += 1) {
                const text = samples[i % samples.length] ?? '';
                const inferenceStart = performance.now();
                await this.runInference(session, text);
                inferenceTimes.push(performance.now() - inferenceStart);
            }

            const memoryAfter = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize || 0;
            return {
                name: provider === 'webgpu' ? 'WebGPU' : 'WASM',
                provider,
                coldStartMs: performance.now() - startTime,
                warmStartMs,
                avgInferenceMs: inferenceTimes.reduce((a, b) => a + b, 0) / inferenceTimes.length,
                minInferenceMs: Math.min(...inferenceTimes),
                maxInferenceMs: Math.max(...inferenceTimes),
                modelLoadMs,
                memoryPeakMb: (memoryAfter - memoryBefore) / (1024 * 1024),
                available: true,
            };
        } catch (error: unknown) {
            return {
                name: provider === 'webgpu' ? 'WebGPU' : 'WASM',
                provider,
                coldStartMs: 0, warmStartMs: 0, avgInferenceMs: 0,
                minInferenceMs: 0, maxInferenceMs: 0, modelLoadMs: 0,
                memoryPeakMb: 0, available: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    private async runInference(session: ort.InferenceSession, text: string): Promise<void> {
        if (!this.tokenizer) throw new Error('Tokenizer not initialized');

        // Transformers.js tokenizer is callable directly
        const encoded = await this.tokenizer(text, { padding: true, truncation: true, max_length: 128 });

        const toBigInt64 = (data: Int32Array | BigInt64Array | number[]): BigInt64Array => {
            if (data instanceof BigInt64Array) return data;
            const arr = data instanceof Int32Array ? Array.from(data) : data;
            const out = new BigInt64Array(arr.length);
            for (let i = 0; i < arr.length; i += 1) out[i] = BigInt(arr[i] ?? 0);
            return out;
        };

        const inputIds = new ort.Tensor('int64', toBigInt64(encoded.input_ids.data), [...encoded.input_ids.dims]);
        const attentionMask = new ort.Tensor('int64', toBigInt64(encoded.attention_mask.data), [...encoded.attention_mask.dims]);

        await session.run({ input_ids: inputIds, attention_mask: attentionMask });
    }

    private isWebGPUSupported(): boolean {
        return typeof navigator !== 'undefined' && 'gpu' in navigator;
    }

    private determineWinner(webgpu: ExecutionProviderBenchmark, wasm: ExecutionProviderBenchmark): 'webgpu' | 'wasm' | 'tie' {
        if (!webgpu.available) return 'wasm';
        if (!wasm.available) return 'webgpu';

        const webgpuScore = this.scoreBackend(webgpu);
        const wasmScore = this.scoreBackend(wasm);
        const adjustedWebgpuScore = webgpuScore * 0.95;

        if (Math.abs(adjustedWebgpuScore - wasmScore) < 0.05) return 'tie';
        return adjustedWebgpuScore < wasmScore ? 'webgpu' : 'wasm';
    }

    private scoreBackend(b: ExecutionProviderBenchmark): number {
        const normalized = {
            coldStart: b.coldStartMs / 5000,
            warmStart: b.warmStartMs / 1000,
            inference: b.avgInferenceMs / 100,
            memory: Math.max(0, b.memoryPeakMb) / 500,
        };
        return normalized.coldStart * 0.15 + normalized.warmStart * 0.15 + normalized.inference * 0.5 + normalized.memory * 0.2;
    }

    private generateRecommendation(winner: 'webgpu' | 'wasm' | 'tie', webgpu: ExecutionProviderBenchmark, wasm: ExecutionProviderBenchmark): string {
        if (!webgpu.available) return `WASM: WebGPU not available (${webgpu.error})`;
        if (!wasm.available) return `WebGPU: WASM failed (${wasm.error})`;

        const speedup = wasm.avgInferenceMs / webgpu.avgInferenceMs;
        if (winner === 'webgpu' && speedup > 1.2) {
            return `WebGPU: ${speedup.toFixed(1)}x faster (${webgpu.avgInferenceMs.toFixed(1)}ms vs ${wasm.avgInferenceMs.toFixed(1)}ms)`;
        }
        if (winner === 'wasm' && speedup < 0.8) {
            return `WASM: ${(1 / speedup).toFixed(1)}x faster (${wasm.avgInferenceMs.toFixed(1)}ms vs ${webgpu.avgInferenceMs.toFixed(1)}ms)`;
        }
        return 'WebGPU: Equivalent performance, better future compatibility';
    }
}

// Test samples for benchmarking
export const BENCHMARK_SAMPLES = [
    'This is a friendly comment with no issues',
    'You are absolutely wrong and stupid',
    'I disagree but respect your opinion',
    'This product is terrible and worthless',
    'Thanks for sharing this helpful information',
    'Go away nobody wants you here',
    'Could you please explain more about this?',
    'What an idiot, cant believe this',
];

export function exportBenchmarkReport(result: BenchmarkResult): string {
    return JSON.stringify(result, null, 2);
}
