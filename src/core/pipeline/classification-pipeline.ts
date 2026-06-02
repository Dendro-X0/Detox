/// <reference types="chrome" />

import type { ContentBlock } from '../../site-adapters/adapter-interface';
import type { CoreIpcMessage } from '../ipc/messages';
import type { FilteredItemRecord } from '../types/block';
import { getThreshold } from '../policy/policy-store';
import { fnv1a32, shouldClassifyText } from './text-gate';
import type { Verdict } from '../types/verdict';
import { verdictFromClassifyResult } from '../types/verdict';

const BATCH_SIZE = 32;
const BATCH_INTERVAL_MS = 150;
const VISIBLE_BATCH_RATIO = 0.7;
const MAX_STORED_FILTERED = 50;
const PREVIEW_MAX_LENGTH = 60;

type BatchItem = {
    readonly id: string;
    readonly text: string;
    readonly hash: string;
    readonly block: ContentBlock;
    readonly isVisible: boolean;
};

type StatsStorageRecord = {
    readonly stats?: {
        scanned: number;
        toxic: number;
    };
};

export type ClassificationPipelineDeps = {
    readonly isEnabled: () => boolean;
    readonly getAdapter: () => {
        applyEnforcement: (blockId: string, verdict: Verdict) => unknown;
        revealBlock: (blockId: string) => void;
    } | null;
    readonly onClassificationRecorded?: () => void;
    readonly onBatchProcessed?: (durationMs: number) => void;
    readonly onQueueDepth?: (depth: number) => void;
    readonly profiler?: {
        startBatch: (id: string) => void;
        endBatch: (itemCount: number) => void;
        markStage: (stage: 'tokenizationMs' | 'inferenceMs' | 'postProcessingMs' | 'overheadMs') => void;
    };
};

export class ClassificationPipeline {
    private readonly deps: ClassificationPipelineDeps;
    private readonly verdictCache = new Map<string, Verdict>();
    private pendingBatches: BatchItem[][] = [];
    private readonly visibleQueue: BatchItem[] = [];
    private readonly hiddenQueue: BatchItem[] = [];
    private batchTimeoutId: number | null = null;
    private intersectionObserver: IntersectionObserver | null = null;
    private batchSequence = 0;

    constructor(deps: ClassificationPipelineDeps) {
        this.deps = deps;
    }

    clearCache(): void {
        this.verdictCache.clear();
    }

    clearQueues(): void {
        this.pendingBatches = [];
        this.visibleQueue.length = 0;
        this.hiddenQueue.length = 0;
        if (this.batchTimeoutId !== null) {
            window.clearTimeout(this.batchTimeoutId);
            this.batchTimeoutId = null;
        }
    }

    handleBlocksAdded(blocks: readonly ContentBlock[]): void {
        if (!this.deps.isEnabled() || blocks.length === 0) return;

        const items: BatchItem[] = blocks.map((block) => {
            const rect = block.element.getBoundingClientRect();
            const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
            this.observeBlockElement(block);
            return {
                id: block.id,
                text: block.text,
                hash: fnv1a32(block.text),
                block,
                isVisible,
            };
        });

        for (const item of items) {
            if (item.isVisible) {
                this.visibleQueue.push(item);
            } else {
                this.hiddenQueue.push(item);
            }
        }

        this.scheduleBatchProcessing();
    }

    handleBlocksRemoved(blockIds: readonly string[]): void {
        for (const id of blockIds) {
            const block = [...this.visibleQueue, ...this.hiddenQueue].find((i) => i.id === id)?.block;
            if (block) this.unobserveBlockElement(block);
        }

        for (let i = this.visibleQueue.length - 1; i >= 0; i -= 1) {
            if (blockIds.includes(this.visibleQueue[i].id)) {
                this.visibleQueue.splice(i, 1);
            }
        }
        for (let i = this.hiddenQueue.length - 1; i >= 0; i -= 1) {
            if (blockIds.includes(this.hiddenQueue[i].id)) {
                this.hiddenQueue.splice(i, 1);
            }
        }

        for (const batch of this.pendingBatches) {
            for (let i = batch.length - 1; i >= 0; i -= 1) {
                if (blockIds.includes(batch[i].id)) {
                    batch.splice(i, 1);
                }
            }
        }
        this.pendingBatches = this.pendingBatches.filter((b) => b.length > 0);
    }

    getQueueDepth(): number {
        return this.visibleQueue.length + this.hiddenQueue.length + this.pendingBatches.flat().length;
    }

    private initIntersectionObserver(): void {
        if (this.intersectionObserver) return;

        this.intersectionObserver = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                const element = entry.target as HTMLElement;
                const id = element.dataset.detoxId;
                if (!id) continue;
                this.updateItemVisibility(id, entry.isIntersecting);
            }
        }, {
            root: null,
            rootMargin: '100px',
            threshold: 0.1,
        });
    }

    private updateItemVisibility(id: string, isVisible: boolean): void {
        const inVisibleIdx = this.visibleQueue.findIndex((i) => i.id === id);
        const inHiddenIdx = this.hiddenQueue.findIndex((i) => i.id === id);

        if (isVisible) {
            if (inHiddenIdx >= 0) {
                const item = this.hiddenQueue.splice(inHiddenIdx, 1)[0];
                if (item) this.visibleQueue.push(item);
            }
        } else if (inVisibleIdx >= 0) {
            const item = this.visibleQueue.splice(inVisibleIdx, 1)[0];
            if (item) this.hiddenQueue.push(item);
        }
    }

    private observeBlockElement(block: ContentBlock): void {
        if (!this.intersectionObserver) this.initIntersectionObserver();
        this.intersectionObserver?.observe(block.element);
    }

    private unobserveBlockElement(block: ContentBlock): void {
        this.intersectionObserver?.unobserve(block.element);
    }

    private sanitizePreview(text: string): string {
        const cleaned = text.replace(/\s+/g, ' ').trim();
        if (cleaned.length <= PREVIEW_MAX_LENGTH) return cleaned;
        return cleaned.slice(0, PREVIEW_MAX_LENGTH) + '...';
    }

    private recordFilteredItem(id: string, verdict: Verdict, content: string): void {
        const item: FilteredItemRecord = {
            id,
            score: verdict.score,
            labelId: verdict.labelId,
            detectorId: verdict.detectorId,
            preview: this.sanitizePreview(content),
            hostname: location.hostname,
            timestamp: Date.now(),
        };
        chrome.storage.session.get('blockedItems', (res: unknown) => {
            const record = res as { blockedItems?: readonly FilteredItemRecord[] };
            const existing = record.blockedItems ?? [];
            const updated = [item, ...existing].slice(0, MAX_STORED_FILTERED);
            chrome.storage.session.set({ blockedItems: updated });
        });
    }

    private updateScannedStats(delta: number): void {
        if (delta <= 0) return;
        chrome.storage.local.get('stats', (res: unknown) => {
            const record = res as StatsStorageRecord;
            const stats = record.stats ?? { scanned: 0, toxic: 0 };
            chrome.storage.local.set({ stats: { scanned: stats.scanned + delta, toxic: stats.toxic } });
        });
    }

    private updateFilteredStats(delta: number): void {
        if (delta <= 0) return;
        chrome.storage.local.get('stats', (res: unknown) => {
            const record = res as StatsStorageRecord;
            const stats = record.stats ?? { scanned: 0, toxic: 0 };
            chrome.storage.local.set({ stats: { scanned: stats.scanned, toxic: stats.toxic + delta } });
        });
    }

    private async processBatchItems(items: readonly BatchItem[]): Promise<void> {
        const batchStartTime = performance.now();
        this.batchSequence += 1;
        const batchId = `${location.hostname}:${this.batchSequence}`;
        this.deps.profiler?.startBatch(batchId);

        const sorted = [...items].sort((a, b) => {
            if (a.isVisible === b.isVisible) return 0;
            return a.isVisible ? -1 : 1;
        });

        if (!this.deps.isEnabled() || sorted.length === 0) return;

        const adapter = this.deps.getAdapter();
        const hashes = sorted.map((item) => ({ id: item.id, text: item.text, hash: item.hash }));
        const skipped = hashes.filter((h) => !shouldClassifyText(h.text));
        const toClassify = hashes.filter((h) => !this.verdictCache.has(h.hash));
        const cached = hashes.filter((h) => this.verdictCache.has(h.hash));

        for (const c of cached) {
            const verdict = this.verdictCache.get(c.hash);
            if (verdict) {
                const block = sorted.find((i) => i.id === c.id)?.block;
                if (block && adapter) {
                    adapter.applyEnforcement(block.id, verdict);
                    if (verdict.matched) this.recordFilteredItem(block.id, verdict, block.text);
                }
                this.deps.onClassificationRecorded?.();
            }
        }
        this.updateScannedStats(cached.length + skipped.length);

        const eligibleToClassify = toClassify.filter((h) => shouldClassifyText(h.text) && !this.verdictCache.has(h.hash));
        if (eligibleToClassify.length === 0) {
            this.deps.profiler?.endBatch(items.length);
            return;
        }

        const request: CoreIpcMessage = {
            type: 'classifyBatch',
            items: eligibleToClassify.map((item) => ({ id: item.id, text: item.text })),
            threshold: getThreshold(),
        };

        this.deps.profiler?.markStage('tokenizationMs');
        try {
            await new Promise<void>((resolve) => {
                chrome.runtime.sendMessage(request, (response: CoreIpcMessage | undefined) => {
                    this.deps.profiler?.markStage('inferenceMs');
                    if (chrome.runtime.lastError) {
                        console.warn('[Core] classifyBatch runtime error', chrome.runtime.lastError.message);
                        resolve();
                        return;
                    }
                    if (response?.type === 'classifyBatchResult') {
                        this.updateScannedStats(response.results.length);
                        let filteredDelta = 0;
                        for (const result of response.results) {
                            const original = eligibleToClassify.find((x) => x.id === result.id);
                            const originalBlock = sorted.find((i) => i.id === result.id)?.block;
                            if (!original || !originalBlock) continue;

                            const verdict = verdictFromClassifyResult(result);
                            this.verdictCache.set(original.hash, verdict);

                            if (verdict.matched) {
                                filteredDelta += 1;
                                if (adapter) {
                                    adapter.applyEnforcement(originalBlock.id, verdict);
                                    this.recordFilteredItem(originalBlock.id, verdict, originalBlock.text);
                                }
                            }
                            this.deps.onClassificationRecorded?.();
                        }
                        this.updateFilteredStats(filteredDelta);
                        this.deps.onBatchProcessed?.(performance.now() - batchStartTime);
                    }
                    this.deps.profiler?.markStage('postProcessingMs');
                    resolve();
                });
            });
        } finally {
            this.deps.profiler?.endBatch(items.length);
        }
    }

    private scheduleBatchProcessing(): void {
        if (this.batchTimeoutId !== null) return;

        this.deps.onQueueDepth?.(this.getQueueDepth());

        this.batchTimeoutId = window.setTimeout(async () => {
            this.batchTimeoutId = null;

            const currentBatch: BatchItem[] = [];
            const visibleTarget = Math.ceil(BATCH_SIZE * VISIBLE_BATCH_RATIO);

            while (currentBatch.length < visibleTarget && this.visibleQueue.length > 0) {
                const item = this.visibleQueue.shift();
                if (item) currentBatch.push(item);
            }

            while (currentBatch.length < BATCH_SIZE && this.hiddenQueue.length > 0) {
                const item = this.hiddenQueue.shift();
                if (item) currentBatch.push(item);
            }

            while (currentBatch.length < BATCH_SIZE && this.pendingBatches.length > 0) {
                const batch = this.pendingBatches.shift();
                if (!batch) break;
                for (const item of batch) {
                    if (currentBatch.length < BATCH_SIZE) {
                        if (item.isVisible) {
                            this.visibleQueue.push(item);
                        } else {
                            this.hiddenQueue.push(item);
                        }
                    } else {
                        if (!this.pendingBatches[0]) this.pendingBatches[0] = [];
                        this.pendingBatches[0].unshift(item);
                    }
                }
            }

            if (currentBatch.length > 0) {
                await this.processBatchItems(currentBatch);
            }

            if (this.visibleQueue.length > 0 || this.hiddenQueue.length > 0 || this.pendingBatches.length > 0) {
                this.scheduleBatchProcessing();
            }
        }, BATCH_INTERVAL_MS);
    }
}
