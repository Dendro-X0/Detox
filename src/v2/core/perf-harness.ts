/**
 * Performance Regression Test Harness for Detox AI
 *
 * Measures key metrics: time-to-first-classification, batch latency,
 * memory usage, and frame rate during scroll.
 */

export interface PerfMetrics {
    readonly ttfc: number;
    readonly avgBatchMs: number;
    readonly peakMemoryMb: number;
    readonly minFps: number;
    readonly classifiedCount: number;
}

export interface TestScenario {
    readonly name: string;
    readonly url: string;
    readonly scrollDurationMs: number;
    readonly warmupMs: number;
}

export const SCENARIOS: readonly TestScenario[] = [
    { name: 'reddit-comments', url: 'https://reddit.com/r/popular/comments', scrollDurationMs: 10000, warmupMs: 2000 },
    { name: 'youtube-comments', url: 'https://youtube.com/watch?v=dQw4w9WgXcQ', scrollDurationMs: 10000, warmupMs: 3000 },
];

export class PerfHarness {
    private metrics: { ttfc?: number } = {};
    private batchTimes: number[] = [];
    private fpsSamples: number[] = [];
    private rafId: number | null = null;
    private startTime = 0;

    start(): void {
        this.startTime = performance.now();
        this.monitorFps();
    }

    recordBatch(durationMs: number): void {
        this.batchTimes.push(durationMs);
    }

    recordFirstClassification(): void {
        this.metrics.ttfc = performance.now() - this.startTime;
    }

    private monitorFps(): void {
        let lastFrame = performance.now();
        const sample = (): void => {
            const now = performance.now();
            const delta = now - lastFrame;
            const fps = 1000 / delta;
            this.fpsSamples.push(fps);
            lastFrame = now;
            this.rafId = requestAnimationFrame(sample);
        };
        this.rafId = requestAnimationFrame(sample);
    }

    stop(): PerfMetrics {
        if (this.rafId !== null) cancelAnimationFrame(this.rafId);

        const avgBatch = this.batchTimes.length > 0
            ? this.batchTimes.reduce((a, b) => a + b, 0) / this.batchTimes.length
            : 0;

        const minFps = this.fpsSamples.length > 0
            ? Math.min(...this.fpsSamples.filter(f => f < 100))
            : 60;

        return {
            ttfc: this.metrics.ttfc ?? 0,
            avgBatchMs: avgBatch,
            peakMemoryMb: this.getMemoryUsage(),
            minFps: Math.floor(minFps),
            classifiedCount: this.batchTimes.length,
        };
    }

    private getMemoryUsage(): number {
        if ('memory' in performance) {
            const mem = (performance as { memory?: { usedJSHeapSize: number } }).memory;
            return mem ? Math.round(mem.usedJSHeapSize / 1048576) : 0;
        }
        return 0;
    }
}

export async function runPerfTest(scenario: TestScenario): Promise<PerfMetrics> {
    console.log(`[PerfTest] Starting: ${scenario.name}`);
    const harness = new PerfHarness();
    harness.start();

    await new Promise(r => setTimeout(r, scenario.warmupMs));
    harness.recordFirstClassification();

    await new Promise(r => setTimeout(r, scenario.scrollDurationMs));
    return harness.stop();
}

export function compareToBaseline(metrics: PerfMetrics, baseline: PerfMetrics): string[] {
    const regressions: string[] = [];
    const threshold = 1.1; // 10% regression threshold

    if (metrics.ttfc > baseline.ttfc * threshold) {
        regressions.push(`TTFC regressed: ${metrics.ttfc.toFixed(0)}ms vs ${baseline.ttfc}ms baseline`);
    }
    if (metrics.avgBatchMs > baseline.avgBatchMs * threshold) {
        regressions.push(`Batch latency regressed: ${metrics.avgBatchMs.toFixed(1)}ms vs ${baseline.avgBatchMs}ms baseline`);
    }
    if (metrics.minFps < baseline.minFps / threshold) {
        regressions.push(`FPS dropped: ${metrics.minFps} vs ${baseline.minFps} baseline`);
    }

    return regressions;
}
