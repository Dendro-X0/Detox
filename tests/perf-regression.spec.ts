import fs from 'node:fs/promises';
import { test, expect } from './extension-fixtures';
import { CONTENT_PERF_REQUEST, CONTENT_PERF_RESPONSE } from '../src/core/ipc/content-messages';
import { E2E_FIXTURE_URL } from './helpers/extension-test-utils';

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
            if (event.data?.type === CONTENT_PERF_RESPONSE) {
                clearTimeout(timeout);
                window.removeEventListener('message', listener);
                resolve(event.data.payload as { metrics: PerformanceMetrics; profileSummary: ProfileSummary });
            }
        };
        window.addEventListener('message', listener);
        window.postMessage({ type: CONTENT_PERF_REQUEST }, '*');
    });
}

test('perf regression snapshot (synthetic content)', async ({ context }) => {
    const page = await context.newPage();
    await page.goto(E2E_FIXTURE_URL, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
        const root = document.createElement('main');
        root.id = 'detox-perf-root';
        const makeParagraph = (index: number): HTMLParagraphElement => {
            const p = document.createElement('p');
            p.textContent = `Synthetic content block ${index}. This is a long enough sentence to be classified by Detox AI and should trigger batch processing.`;
            return p;
        };
        for (let i = 0; i < 60; i += 1) {
            root.appendChild(makeParagraph(i));
        }
        document.body.appendChild(root);
    });
    await expect.poll(async () => {
        try {
            const result = await page.evaluate(queryContentScriptMetrics);
            return result.metrics.totalClassified;
        } catch {
            return 0;
        }
    }, { timeout: 30_000, intervals: [500, 1000, 2000] }).toBeGreaterThan(0);
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
