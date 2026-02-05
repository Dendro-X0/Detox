import fs from 'node:fs/promises';
import { test, expect } from './extension-fixtures';

interface ExecutionProviderBenchmark {
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

interface BenchmarkResult {
    readonly timestamp: string;
    readonly userAgent: string;
    readonly platform: string;
    readonly webgpu: ExecutionProviderBenchmark;
    readonly wasm: ExecutionProviderBenchmark;
    readonly winner: 'webgpu' | 'wasm' | 'tie';
    readonly recommendation: string;
}

test('backend benchmark - WebGPU vs WASM', async ({ context, extensionId }) => {
    const page = await context.newPage();

    // Navigate to the benchmark page
    await page.goto(`chrome-extension://${extensionId}/backend-benchmark.html`, {
        waitUntil: 'domcontentloaded',
    });

    // Wait for benchmark to complete or error
    await page.waitForFunction(
        () => (window as unknown as { benchmarkComplete?: boolean; benchmarkError?: Error }).benchmarkComplete === true ||
              (window as unknown as { benchmarkComplete?: boolean; benchmarkError?: Error }).benchmarkError !== undefined,
        { timeout: 120000 }
    );

    // Check for errors
    const error = await page.evaluate(() => (window as unknown as { benchmarkError?: Error }).benchmarkError);
    if (error) {
        throw new Error(`Benchmark failed: ${error.message || String(error)}`);
    }

    // Get results
    const result = await page.evaluate(() => (window as unknown as { benchmarkResult: BenchmarkResult }).benchmarkResult);

    // Save the benchmark report
    const outPath = test.info().outputPath('backend-benchmark-report.json');
    await fs.writeFile(outPath, JSON.stringify(result, null, 2), 'utf-8');

    // Assertions with detailed error messages
    if (!result.webgpu.available && !result.wasm.available) {
        throw new Error(
            `Both providers failed. WebGPU error: ${result.webgpu.error}, WASM error: ${result.wasm.error}`
        );
    }
    expect(result.wasm.available).toBe(true);

    // Log summary to console
    console.log('\n=== Backend Benchmark Results ===');
    console.log(`Platform: ${result.platform}`);
    console.log(`Winner: ${result.winner}`);
    console.log(`Recommendation: ${result.recommendation}`);
    console.log('\nWebGPU:', result.webgpu.available
        ? `${result.webgpu.avgInferenceMs.toFixed(1)}ms avg, ${result.webgpu.coldStartMs.toFixed(0)}ms cold start`
        : `Not available (${result.webgpu.error})`);
    console.log('WASM:', result.wasm.available
        ? `${result.wasm.avgInferenceMs.toFixed(1)}ms avg, ${result.wasm.coldStartMs.toFixed(0)}ms cold start`
        : `Not available (${result.wasm.error})`);
    console.log('==================================\n');

    // Debug: if both failed, print full result
    if (!result.webgpu.available && !result.wasm.available) {
        console.log('Full result object:', JSON.stringify(result, null, 2));
    }

    // Performance guardrails - WASM should work within reasonable time
    if (result.wasm.available) {
        expect(result.wasm.avgInferenceMs).toBeLessThan(5000);
    }
});
