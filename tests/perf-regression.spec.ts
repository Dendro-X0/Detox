import fs from 'node:fs/promises';
import { test, expect } from './extension-fixtures';
import {
    createFilteringStorageSeed,
    E2E_FIXTURE_URL,
    seedExtensionStorage,
    waitForClassifications,
} from './helpers/extension-test-utils';

interface PerformanceMetrics {
    readonly firstClassificationTime: number | null;
    readonly totalClassified: number;
    readonly totalBatches: number;
    readonly averageBatchTime: number;
    readonly throughput: number;
    readonly averageQueueDepth: number;
    readonly currentQueueDepth: number;
}

interface ProfileSummary {
    readonly totalBatches: number;
    readonly totalItems: number;
    readonly avgBatchTimeMs: number;
    readonly avgTokenizationMs: number;
    readonly avgInferenceMs: number;
    readonly avgPostProcessingMs: number;
    readonly p95InferenceMs: number;
    readonly throughputPerSec: number;
}

interface PerfSnapshot {
    readonly timestamp: string;
    readonly url: string;
    readonly metrics: PerformanceMetrics;
    readonly profileSummary: ProfileSummary;
}

async function queryContentScriptMetrics(): Promise<{
    readonly metrics: PerformanceMetrics;
    readonly profileSummary: ProfileSummary;
}> {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error('Timeout waiting for content script response'));
        }, 5000);
        const listener = (event: MessageEvent) => {
            if (event.data?.type === 'slPerfResponse') {
                clearTimeout(timeout);
                window.removeEventListener('message', listener);
                resolve(event.data.payload as { metrics: PerformanceMetrics; profileSummary: ProfileSummary });
            }
        };
        window.addEventListener('message', listener);
        window.postMessage({ type: 'slGetPerfMetrics' }, '*');
    });
}

test('perf regression snapshot (synthetic content)', async ({ context }) => {
    await seedExtensionStorage(context, createFilteringStorageSeed());
    const page = await context.newPage();
    await page.goto(E2E_FIXTURE_URL, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
        const root = document.createElement('main');
        root.id = 'detox-perf-root';
        const makeParagraph = (index: number): HTMLParagraphElement => {
            const p = document.createElement('p');
            p.textContent = `Synthetic outrageous scandal block ${index}. This furious viral engagement bait has enough words to be classified by SignalLens and should trigger batch processing reliably.`;
            return p;
        };
        for (let i = 0; i < 60; i += 1) {
            root.appendChild(makeParagraph(i));
        }
        document.body.appendChild(root);
    });
    await waitForClassifications(page, 1);
    const { metrics, profileSummary } = await page.evaluate(queryContentScriptMetrics);
    const snapshot: PerfSnapshot = {
        timestamp: new Date().toISOString(),
        url: page.url(),
        metrics,
        profileSummary,
    };
    const outPath = test.info().outputPath('perf-snapshot.json');
    await fs.writeFile(outPath, JSON.stringify(snapshot, null, 2), 'utf-8');
    expect(metrics.averageBatchTime).toBeLessThan(5000);
    expect(profileSummary.avgBatchTimeMs).toBeLessThan(5000);
});
