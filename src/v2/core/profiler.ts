/**
 * Profiling utilities for batch processing metrics
 * Tracks detailed timing breakdowns for classification pipeline stages.
 */

export interface BatchProfile {
    readonly batchId: string;
    readonly timestamp: number;
    readonly items: number;
    readonly stages: StageTimings;
    readonly totalMs: number;
}

export interface StageTimings {
    readonly tokenizationMs: number;
    readonly inferenceMs: number;
    readonly postProcessingMs: number;
    readonly overheadMs: number;
}

export interface ProfileSummary {
    readonly totalBatches: number;
    readonly totalItems: number;
    readonly avgBatchTimeMs: number;
    readonly avgTokenizationMs: number;
    readonly avgInferenceMs: number;
    readonly avgPostProcessingMs: number;
    readonly p95InferenceMs: number;
    readonly throughputPerSec: number;
}

export class BatchProfiler {
    private profiles: BatchProfile[] = [];
    private activeBatch: {
        id: string;
        startTime: number;
        stageStart: number;
        timings: Partial<StageTimings>;
    } | null = null;
    private readonly maxProfiles: number;

    constructor(maxProfiles = 100) {
        this.maxProfiles = maxProfiles;
    }

    startBatch(batchId: string): void {
        const now = performance.now();
        this.activeBatch = {
            id: batchId,
            startTime: now,
            stageStart: now,
            timings: {},
        };
    }

    markStage(stage: keyof StageTimings): void {
        if (!this.activeBatch) return;
        const now = performance.now();
        const duration = now - this.activeBatch.stageStart;
        (this.activeBatch.timings as Record<string, number>)[stage] = duration;
        this.activeBatch.stageStart = now;
    }

    endBatch(items: number): BatchProfile {
        if (!this.activeBatch) throw new Error('No active batch to end');

        const now = performance.now();
        const totalMs = now - this.activeBatch.startTime;
        const timings = this.activeBatch.timings as StageTimings;

        const profile: BatchProfile = {
            batchId: this.activeBatch.id,
            timestamp: Date.now(),
            items,
            stages: {
                tokenizationMs: timings.tokenizationMs ?? 0,
                inferenceMs: timings.inferenceMs ?? 0,
                postProcessingMs: timings.postProcessingMs ?? 0,
                overheadMs: timings.overheadMs ?? Math.max(0, totalMs - 
                    (timings.tokenizationMs ?? 0) - 
                    (timings.inferenceMs ?? 0) - 
                    (timings.postProcessingMs ?? 0)),
            },
            totalMs,
        };

        this.profiles.push(profile);
        if (this.profiles.length > this.maxProfiles) {
            this.profiles.shift();
        }

        this.activeBatch = null;
        return profile;
    }

    getSummary(): ProfileSummary {
        if (this.profiles.length === 0) {
            return {
                totalBatches: 0,
                totalItems: 0,
                avgBatchTimeMs: 0,
                avgTokenizationMs: 0,
                avgInferenceMs: 0,
                avgPostProcessingMs: 0,
                p95InferenceMs: 0,
                throughputPerSec: 0,
            };
        }

        const totalItems = this.profiles.reduce((sum, p) => sum + p.items, 0);
        const totalTime = this.profiles.reduce((sum, p) => sum + p.totalMs, 0);
        const inferences = this.profiles.map(p => p.stages.inferenceMs).sort((a, b) => a - b);
        const p95Idx = Math.floor(inferences.length * 0.95);

        return {
            totalBatches: this.profiles.length,
            totalItems,
            avgBatchTimeMs: totalTime / this.profiles.length,
            avgTokenizationMs: this.avg(p => p.stages.tokenizationMs),
            avgInferenceMs: this.avg(p => p.stages.inferenceMs),
            avgPostProcessingMs: this.avg(p => p.stages.postProcessingMs),
            p95InferenceMs: inferences[p95Idx] ?? 0,
            throughputPerSec: totalItems / (totalTime / 1000),
        };
    }

    exportToJson(): string {
        return JSON.stringify({
            summary: this.getSummary(),
            profiles: this.profiles,
        }, null, 2);
    }

    private avg(fn: (p: BatchProfile) => number): number {
        return this.profiles.reduce((sum, p) => sum + fn(p), 0) / this.profiles.length;
    }
}

// Global profiler instance for the content script
export const globalProfiler = new BatchProfiler(200);
