import { BackendBenchmarkRunner, exportBenchmarkReport } from './v2/core/backend-benchmark';

async function runBenchmark(): Promise<void> {
    const statusEl = document.getElementById('status');
    const resultsEl = document.getElementById('results');
    const rawJsonEl = document.getElementById('raw-json');

    if (!statusEl) return;

    try {
        statusEl.textContent = 'Loading model and tokenizer...';

        const runner = new BackendBenchmarkRunner();
        const packUrl = chrome.runtime.getURL('model-packs/toxicity-multi-xlm-r/modelpack.json');
        await runner.initialize(packUrl);

        statusEl.textContent = 'Running benchmarks (this may take 1-2 minutes)...';

        const result = await runner.runBenchmarks();
        const reportJson = exportBenchmarkReport(result);

        // Display results
        statusEl.className = 'status complete';
        statusEl.innerHTML = `<span class="winner">Winner: ${result.winner.toUpperCase()}</span> - ${result.recommendation}`;

        if (resultsEl) {
            resultsEl.innerHTML = `
                <h2>Results</h2>
                <div class="metric"><span>Platform:</span> <span>${result.platform}</span></div>
                <div class="metric"><span>User Agent:</span> <span>${result.userAgent.substring(0, 50)}...</span></div>
                <h3>WebGPU</h3>
                ${result.webgpu.available ? `
                    <div class="metric"><span>Available:</span> <span>Yes</span></div>
                    <div class="metric"><span>Avg Inference:</span> <span>${result.webgpu.avgInferenceMs.toFixed(1)} ms</span></div>
                    <div class="metric"><span>Min/Max:</span> <span>${result.webgpu.minInferenceMs.toFixed(1)} / ${result.webgpu.maxInferenceMs.toFixed(1)} ms</span></div>
                    <div class="metric"><span>Cold Start:</span> <span>${result.webgpu.coldStartMs.toFixed(0)} ms</span></div>
                    <div class="metric"><span>Warm Start:</span> <span>${result.webgpu.warmStartMs.toFixed(0)} ms</span></div>
                    <div class="metric"><span>Model Load:</span> <span>${result.webgpu.modelLoadMs.toFixed(0)} ms</span></div>
                    <div class="metric"><span>Memory Peak:</span> <span>${result.webgpu.memoryPeakMb.toFixed(1)} MB</span></div>
                ` : `
                    <div class="metric"><span>Available:</span> <span>No - ${result.webgpu.error}</span></div>
                `}
                <h3>WASM</h3>
                ${result.wasm.available ? `
                    <div class="metric"><span>Available:</span> <span>Yes</span></div>
                    <div class="metric"><span>Avg Inference:</span> <span>${result.wasm.avgInferenceMs.toFixed(1)} ms</span></div>
                    <div class="metric"><span>Min/Max:</span> <span>${result.wasm.minInferenceMs.toFixed(1)} / ${result.wasm.maxInferenceMs.toFixed(1)} ms</span></div>
                    <div class="metric"><span>Cold Start:</span> <span>${result.wasm.coldStartMs.toFixed(0)} ms</span></div>
                    <div class="metric"><span>Warm Start:</span> <span>${result.wasm.warmStartMs.toFixed(0)} ms</span></div>
                    <div class="metric"><span>Model Load:</span> <span>${result.wasm.modelLoadMs.toFixed(0)} ms</span></div>
                    <div class="metric"><span>Memory Peak:</span> <span>${result.wasm.memoryPeakMb.toFixed(1)} MB</span></div>
                ` : `
                    <div class="metric"><span>Available:</span> <span>No - ${result.wasm.error}</span></div>
                `}
            `;
        }

        if (rawJsonEl) {
            rawJsonEl.textContent = reportJson;
        }

        // Signal completion for test harness
        (window as unknown as { benchmarkComplete: boolean }).benchmarkComplete = true;
        (window as unknown as { benchmarkResult: typeof result }).benchmarkResult = result;

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        statusEl.className = 'status error';
        statusEl.textContent = `Error: ${errorMessage}`;
        console.error(error);
        (window as unknown as { benchmarkError: Error }).benchmarkError = error instanceof Error ? error : new Error(String(error));
    }
}

runBenchmark();
