/// <reference types="chrome" />

import type { ContentUnit } from '../scanner/content-unit';
import { applyUnitEnforcement } from '../enforcement/apply-unit-enforcement';
import { ENFORCEMENT_DATASET } from '../enforcement/element-state';
import type { CoreIpcMessage } from '../ipc/messages';
import type { FilteredItemRecord } from '../types/block';
import { isDomainAllowlisted } from '../rules/user-rules-store';
import { getThresholdForHost } from '../policy/policy-store';
import { sessionGet, sessionSet } from '../storage/extension-session';
import { recordBlocksDiscovered, recordBlocksScanned } from '../storage/scan-stats-store';
import { shouldClassifyText } from './text-gate';
import type { Verdict } from '../types/verdict';
import { verdictFromClassifyResult } from '../types/verdict';
import { DEFAULT_LABEL_ID, HEURISTIC_DETECTOR_ID } from '../../mods/detectors/constants';
import { ProgressiveScanPump } from './progressive-scan-pump';
import { ScanWorkRegistry, type ScanWorkItem } from './scan-work-registry';

const CLASSIFY_CHUNK_SIZE = 32;
const MAX_STORED_FILTERED = 50;
const PREVIEW_MAX_LENGTH = 60;
const VISIBLE_PRIORITY = 2;

function currentPageKey(): string {
    return `${location.origin}${location.pathname}${location.search}`;
}

function isUnitVisible(unit: ContentUnit): boolean {
    const rect = unit.element.getBoundingClientRect();
    return rect.top < window.innerHeight + 120 && rect.bottom > -120;
}

export type ClassificationPipelineDeps = {
    readonly isEnabled: () => boolean;
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
    private readonly registry = new ScanWorkRegistry();
    private readonly pump: ProgressiveScanPump;
    private readonly scannedUnitIds = new Set<string>();
    private intersectionObserver: IntersectionObserver | null = null;
    private batchSequence = 0;

    constructor(deps: ClassificationPipelineDeps) {
        this.deps = deps;
        this.pump = new ProgressiveScanPump({
            runSlice: (maxItems, budgetMs) => this.runScanSlice(maxItems, budgetMs),
            hasBacklog: () => this.registry.pendingCount() > 0,
            onSliceComplete: () => this.emitQueueDepth(),
        });
    }

    clearCache(): void {
        this.verdictCache.clear();
    }

    clearQueues(): void {
        this.registry.clear();
        this.scannedUnitIds.clear();
        this.pump.reset();
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
            this.intersectionObserver = null;
        }
    }

    kickProgressiveScan(immediate = false): void {
        if (this.registry.pendingCount() > 0) {
            this.pump.kick(immediate);
        }
    }

    getScanProgress(): { readonly pending: number; readonly done: number; readonly total: number } {
        return {
            pending: this.registry.pendingCount(),
            done: this.registry.doneCount(),
            total: this.registry.totalCount(),
        };
    }

    handleUnitsAdded(units: readonly ContentUnit[]): void {
        if (!this.deps.isEnabled() || units.length === 0) return;
        if (isDomainAllowlisted(location.hostname)) return;

        const added = this.registry.addUnits(units, isUnitVisible);
        if (added > 0) {
            void recordBlocksDiscovered(added, currentPageKey());
        }

        for (const unit of units) {
            this.observeUnitElement(unit);
        }

        this.emitQueueDepth();
        this.pump.kick(true);
    }

    handleUnitsRemoved(unitIds: readonly string[]): void {
        if (unitIds.length === 0) return;
        this.registry.remove(unitIds);
        this.emitQueueDepth();
    }

    handleUnitsUpdated(units: readonly ContentUnit[]): void {
        if (units.length === 0) return;
        for (const unit of units) {
            this.registry.updateUnitReference(unit);
            this.observeUnitElement(unit);
        }
    }

    getQueueDepth(): number {
        return this.registry.pendingCount();
    }

    private emitQueueDepth(): void {
        this.deps.onQueueDepth?.(this.registry.pendingCount());
    }

    private initIntersectionObserver(): void {
        if (this.intersectionObserver) return;

        this.intersectionObserver = new IntersectionObserver((entries) => {
            let visibilityChanged = false;
            for (const entry of entries) {
                const element = entry.target as HTMLElement;
                const id = element.dataset[ENFORCEMENT_DATASET.blockId];
                if (!id) continue;
                this.registry.updateVisibility(id, entry.isIntersecting);
                visibilityChanged = true;
            }
            if (visibilityChanged && this.registry.pendingCount() > 0) {
                this.pump.kick();
            }
        }, {
            root: null,
            rootMargin: '200px',
            threshold: 0,
        });
    }

    private observeUnitElement(unit: ContentUnit): void {
        const target = unit.element;
        if (!target.dataset[ENFORCEMENT_DATASET.blockId]) {
            target.dataset[ENFORCEMENT_DATASET.blockId] = unit.id;
        }
        if (!this.intersectionObserver) this.initIntersectionObserver();
        this.intersectionObserver?.observe(target);
    }

    private async runScanSlice(maxItems: number, budgetMs: number): Promise<number> {
        const started = performance.now();
        let processed = 0;

        while (
            processed < maxItems &&
            performance.now() - started < budgetMs &&
            this.registry.pendingCount() > 0
        ) {
            const chunkSize = Math.min(CLASSIFY_CHUNK_SIZE, maxItems - processed);
            const batch = this.registry.takeBatch(chunkSize);
            if (batch.length === 0) break;

            const ids = batch.map((item) => item.id);
            try {
                await this.processBatchItems(batch);
                this.registry.markDone(ids);
                processed += batch.length;
            } catch (error) {
                console.warn('[Core] scan slice failed', error);
                this.registry.releaseProcessing(ids);
                break;
            }
        }

        return processed;
    }

    private sanitizePreview(text: string): string {
        const cleaned = text.replace(/\s+/g, ' ').trim();
        if (cleaned.length <= PREVIEW_MAX_LENGTH) return cleaned;
        return cleaned.slice(0, PREVIEW_MAX_LENGTH) + '...';
    }

    private async recordFilteredItem(id: string, verdict: Verdict, content: string): Promise<void> {
        const item: FilteredItemRecord = {
            id,
            score: verdict.score,
            labelId: verdict.labelId,
            detectorId: verdict.detectorId,
            preview: this.sanitizePreview(content),
            hostname: location.hostname,
            timestamp: Date.now(),
        };
        const existing = (await sessionGet<readonly FilteredItemRecord[]>('blockedItems')) ?? [];
        const updated = [item, ...existing].slice(0, MAX_STORED_FILTERED);
        await sessionSet('blockedItems', updated);
    }

    private async processBatchItems(items: readonly ScanWorkItem[]): Promise<void> {
        const batchStartTime = performance.now();
        this.batchSequence += 1;
        const batchId = `${location.hostname}:${this.batchSequence}`;
        this.deps.profiler?.startBatch(batchId);

        const sorted = [...items].sort((a, b) => {
            if (a.priority === b.priority) return 0;
            return a.priority >= VISIBLE_PRIORITY ? -1 : 1;
        });

        if (!this.deps.isEnabled() || sorted.length === 0) return;

        const hashes = sorted.map((item) => ({ id: item.id, text: item.text, hash: item.hash }));
        const toClassify = hashes.filter((h) => !this.verdictCache.has(h.hash));
        const cached = hashes.filter((h) => this.verdictCache.has(h.hash));

        let filteredDelta = 0;

        for (const c of cached) {
            const verdict = this.verdictCache.get(c.hash);
            if (verdict) {
                const unit = sorted.find((i) => i.id === c.id)?.unit;
                if (unit && unit.element.dataset[ENFORCEMENT_DATASET.userRevealed] !== 'true') {
                    applyUnitEnforcement(unit.id, unit.element, verdict);
                    if (verdict.matched) {
                        filteredDelta += 1;
                        void this.recordFilteredItem(unit.id, verdict, unit.text);
                    }
                }
                this.deps.onClassificationRecorded?.();
            }
        }

        const eligibleToClassify = toClassify.filter((h) => shouldClassifyText(h.text) && !this.verdictCache.has(h.hash));
        const gateSkipped = toClassify.filter((h) => !shouldClassifyText(h.text));
        for (const gateItem of gateSkipped) {
            this.verdictCache.set(gateItem.hash, {
                matched: false,
                score: 0,
                labelId: DEFAULT_LABEL_ID,
                detectorId: HEURISTIC_DETECTOR_ID,
            });
            this.deps.onClassificationRecorded?.();
        }

        if (eligibleToClassify.length === 0) {
            await this.recordUniqueScans(sorted, filteredDelta);
            this.deps.profiler?.endBatch(items.length);
            return;
        }

        const request: CoreIpcMessage = {
            type: 'classifyBatch',
            items: eligibleToClassify.map((item) => ({ id: item.id, text: item.text })),
            threshold: getThresholdForHost(location.hostname),
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
                        for (const result of response.results) {
                            const original = eligibleToClassify.find((x) => x.id === result.id);
                            const originalUnit = sorted.find((i) => i.id === result.id)?.unit;
                            if (!original || !originalUnit) continue;

                            const verdict = verdictFromClassifyResult(result);
                            this.verdictCache.set(original.hash, verdict);

                            if (verdict.matched) {
                                filteredDelta += 1;
                                if (originalUnit.element.dataset[ENFORCEMENT_DATASET.userRevealed] !== 'true') {
                                    applyUnitEnforcement(originalUnit.id, originalUnit.element, verdict);
                                    void this.recordFilteredItem(originalUnit.id, verdict, originalUnit.text);
                                }
                            }
                            this.deps.onClassificationRecorded?.();
                        }
                        this.deps.onBatchProcessed?.(performance.now() - batchStartTime);
                    }
                    this.deps.profiler?.markStage('postProcessingMs');
                    resolve();
                });
            });
        } finally {
            await this.recordUniqueScans(sorted, filteredDelta);
            this.deps.profiler?.endBatch(items.length);
        }
    }

    private async recordUniqueScans(items: readonly ScanWorkItem[], filteredDelta: number): Promise<void> {
        let scannedDelta = 0;
        for (const item of items) {
            if (this.scannedUnitIds.has(item.id)) continue;
            this.scannedUnitIds.add(item.id);
            scannedDelta += 1;
        }
        await recordBlocksScanned(scannedDelta, filteredDelta, currentPageKey());
    }
}
