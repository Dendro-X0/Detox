/// <reference types="chrome" />
import type { DetoxIpcMessage } from './v2/core/detox-ipc';
import type { SiteAdapter, ContentBlock } from './site-adapters/adapter-interface';
import { getMatchingAdapter } from './site-adapters/adapter-interface';
import { globalProfiler } from './v2/core/profiler';

// Import adapters to register them
import './site-adapters/reddit-adapter';
import './site-adapters/youtube-adapter';
import './site-adapters/quora-adapter';
import './site-adapters/generic-adapter';

console.log('Detox AI: Content Script Loaded [v2 - Adapter-based]');

let isEnabled = true;
let currentAdapter: SiteAdapter | null = null;
let stopObserving: (() => void) | null = null;

const BATCH_SIZE: number = 32;
const BATCH_INTERVAL_MS: number = 150;

const NAVIGATION_POLL_INTERVAL_MS: number = 750;
const NAVIGATION_DEBOUNCE_MS: number = 250;

type Verdict = {
    readonly isToxic: boolean;
    readonly score: number;
    readonly label: string;
};

type EnabledStorageRecord = {
    readonly enabled?: boolean;
};

type StatsStorageRecord = {
    readonly stats?: {
        scanned: number;
        toxic: number;
    };
};

type PolicyStorageRecord = {
    readonly policy?: {
        preset: string;
        threshold: number;
        perSite: Record<string, number>;
    };
};

type BlockedItem = {
    readonly id: string;
    readonly score: number;
    readonly label: string;
    readonly preview: string;
    readonly hostname: string;
    readonly timestamp: number;
};

// Current policy threshold (default 0.5)
let currentThreshold: number = 0.5;
const MAX_STORED_BLOCKS: number = 50;
const PREVIEW_MAX_LENGTH: number = 60;

const verdictCache = new Map<string, Verdict>();

let lastPageKey: string | null = null;
let navigationDebounceTimerId: number | null = null;
let batchSequence: number = 0;

// Performance metrics
type PerformanceMetrics = {
    navigationStartTime: number;
    firstClassificationTime: number | null;
    totalClassified: number;
    totalBatches: number;
    totalBatchTime: number;
    queueDepthHistory: number[];
};

const perfMetrics: PerformanceMetrics = {
    navigationStartTime: 0,
    firstClassificationTime: null,
    totalClassified: 0,
    totalBatches: 0,
    totalBatchTime: 0,
    queueDepthHistory: [],
};

function resetPerfMetrics(): void {
    perfMetrics.navigationStartTime = performance.now();
    perfMetrics.firstClassificationTime = null;
    perfMetrics.totalClassified = 0;
    perfMetrics.totalBatches = 0;
    perfMetrics.totalBatchTime = 0;
    perfMetrics.queueDepthHistory = [];
}

function recordClassification(): void {
    perfMetrics.totalClassified += 1;
    if (perfMetrics.firstClassificationTime === null) {
        perfMetrics.firstClassificationTime = performance.now() - perfMetrics.navigationStartTime;
        console.log(`[Detox] Time to first classification: ${perfMetrics.firstClassificationTime.toFixed(1)}ms`);
    }
}

function recordBatchProcessed(durationMs: number): void {
    perfMetrics.totalBatches += 1;
    perfMetrics.totalBatchTime += durationMs;
}

function recordQueueDepth(depth: number): void {
    // Keep last 100 samples
    perfMetrics.queueDepthHistory.push(depth);
    if (perfMetrics.queueDepthHistory.length > 100) {
        perfMetrics.queueDepthHistory.shift();
    }
}

function getAverageQueueDepth(): number {
    if (perfMetrics.queueDepthHistory.length === 0) return 0;
    const sum = perfMetrics.queueDepthHistory.reduce((a, b) => a + b, 0);
    return sum / perfMetrics.queueDepthHistory.length;
}

function getAverageBatchTime(): number {
    if (perfMetrics.totalBatches === 0) return 0;
    return perfMetrics.totalBatchTime / perfMetrics.totalBatches;
}

function getThroughput(): number {
    const elapsed = performance.now() - perfMetrics.navigationStartTime;
    if (elapsed < 1000) return 0;
    return (perfMetrics.totalClassified / elapsed) * 1000; // items per second
}

function fnv1a32(text: string): string {
    let hash = 0x811c9dc5;
    for (let i = 0; i < text.length; i += 1) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
}

function requestNavigationCheck(): void {
    if (navigationDebounceTimerId !== null) return;
    navigationDebounceTimerId = window.setTimeout(() => {
        navigationDebounceTimerId = null;
        onNavigationMaybeChanged();
    }, NAVIGATION_DEBOUNCE_MS);
}

function shouldClassifyText(text: string): boolean {
    let asciiLetterCount = 0;
    let nonLatinCount = 0;
    for (let i = 0; i < text.length; i += 1) {
        const code = text.charCodeAt(i);
        const isAsciiLetter = (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
        if (isAsciiLetter) asciiLetterCount += 1;
        const isBasicLatin = code <= 0x024f;
        if (!isBasicLatin) nonLatinCount += 1;
    }
    const minLetters = 12;
    if (asciiLetterCount < minLetters && nonLatinCount > 0) return false;
    const nonLatinRatio = text.length > 0 ? nonLatinCount / text.length : 0;
    return nonLatinRatio < 0.15;
}

// Listen for Toggle
chrome.storage.onChanged.addListener((changes) => {
    if (changes.enabled) {
        isEnabled = changes.enabled.newValue as boolean;
        if (!isEnabled) {
            // Reveal all blocked content
            document.querySelectorAll<HTMLElement>('[data-detox-blocked="true"]').forEach(el => {
                if (currentAdapter) {
                    const id = el.dataset.detoxId;
                    if (id) currentAdapter.revealBlock(id);
                }
            });
        } else {
            initAdapter();
        }
    }
});

// Initial Load
chrome.storage.local.get('enabled', (res: unknown) => {
    const record = res as EnabledStorageRecord;
    isEnabled = record.enabled ?? true;
    loadPolicy();
    if (isEnabled) {
        resetPageState();
        console.log('Detox AI: Initializing...');
        chrome.storage.session.remove('blockedItems');
        setTimeout(() => requestIdleCallback(initAdapter), 2000);
    }
});

function getPageKey(): string {
    return `${location.origin}${location.pathname}`;
}

function resetStats(): void {
    chrome.storage.local.set({ stats: { scanned: 0, toxic: 0 } });
}

function resetPageState(): void {
    if (stopObserving) {
        stopObserving();
        stopObserving = null;
    }
    currentAdapter?.destroy();
    currentAdapter = null;
    verdictCache.clear();
    resetStats();
    resetPerfMetrics();
    lastPageKey = getPageKey();
}

function scheduleRescan(): void {
    if (!isEnabled) return;
    setTimeout(() => requestIdleCallback(initAdapter), 500);
}

function onNavigationMaybeChanged(): void {
    const key = getPageKey();
    if (lastPageKey === null) {
        lastPageKey = key;
        return;
    }
    if (key === lastPageKey) return;
    resetPageState();
    scheduleRescan();
}

function installNavigationHooks(): void {
    window.addEventListener('popstate', () => requestNavigationCheck());
    const originalPushState = history.pushState.bind(history);
    history.pushState = (...args: Parameters<History['pushState']>): void => {
        originalPushState(...args);
        requestNavigationCheck();
    };
    const originalReplaceState = history.replaceState.bind(history);
    history.replaceState = (...args: Parameters<History['replaceState']>): void => {
        originalReplaceState(...args);
        requestNavigationCheck();
    };
    window.setInterval(() => {
        requestNavigationCheck();
    }, NAVIGATION_POLL_INTERVAL_MS);
}

installNavigationHooks();

function loadPolicy(): void {
    chrome.storage.local.get('policy', (res: unknown) => {
        const record = res as PolicyStorageRecord;
        if (record.policy) {
            currentThreshold = record.policy.threshold;
        }
    });
}

// Listen for policy changes
chrome.storage.onChanged.addListener((changes) => {
    if (changes.policy) {
        const newPolicy = changes.policy.newValue as PolicyStorageRecord['policy'];
        if (newPolicy) {
            currentThreshold = newPolicy.threshold;
        }
    }
});

function sanitizePreview(text: string): string {
    const cleaned = text.replace(/\s+/g, ' ').trim();
    if (cleaned.length <= PREVIEW_MAX_LENGTH) return cleaned;
    return cleaned.slice(0, PREVIEW_MAX_LENGTH) + '...';
}

function recordBlockedItem(id: string, verdict: Verdict, content: string): void {
    const item: BlockedItem = {
        id,
        score: verdict.score,
        label: verdict.label,
        preview: sanitizePreview(content),
        hostname: location.hostname,
        timestamp: Date.now(),
    };
    chrome.storage.session.get('blockedItems', (res: unknown) => {
        const record = res as { blockedItems?: readonly BlockedItem[] };
        const existing = record.blockedItems ?? [];
        const updated = [item, ...existing].slice(0, MAX_STORED_BLOCKS);
        chrome.storage.session.set({ blockedItems: updated });
    });
}

function updateScannedStats(delta: number): void {
    if (delta <= 0) return;
    chrome.storage.local.get('stats', (res: unknown) => {
        const record = res as StatsStorageRecord;
        const stats = record.stats ?? { scanned: 0, toxic: 0 };
        chrome.storage.local.set({ stats: { scanned: stats.scanned + delta, toxic: stats.toxic } });
    });
}

function updateToxicStats(delta: number): void {
    if (delta <= 0) return;
    chrome.storage.local.get('stats', (res: unknown) => {
        const record = res as StatsStorageRecord;
        const stats = record.stats ?? { scanned: 0, toxic: 0 };
        chrome.storage.local.set({ stats: { scanned: stats.scanned, toxic: stats.toxic + delta } });
    });
}

type BatchItem = {
    readonly id: string;
    readonly text: string;
    readonly hash: string;
    readonly block: ContentBlock;
    readonly isVisible: boolean;
};

let pendingBatches: BatchItem[][] = [];
const visibleQueue: BatchItem[] = [];
const hiddenQueue: BatchItem[] = [];
let batchTimeoutId: number | null = null;
let intersectionObserver: IntersectionObserver | null = null;

const VISIBLE_BATCH_RATIO: number = 0.7;

function initIntersectionObserver(): void {
    if (intersectionObserver) return;

    intersectionObserver = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            const element = entry.target as HTMLElement;
            const id = element.dataset.detoxId;
            if (!id) continue;

            // Update visibility status in queues
            const isVisible = entry.isIntersecting;
            updateItemVisibility(id, isVisible);
        }
    }, {
        root: null,
        rootMargin: '100px', // Start processing slightly before visible
        threshold: 0.1,
    });
}

function updateItemVisibility(id: string, isVisible: boolean): void {
    // Find and move item between queues if needed
    const inVisibleIdx = visibleQueue.findIndex(i => i.id === id);
    const inHiddenIdx = hiddenQueue.findIndex(i => i.id === id);

    if (isVisible) {
        if (inHiddenIdx >= 0) {
            const item = hiddenQueue.splice(inHiddenIdx, 1)[0];
            if (item) visibleQueue.push(item);
        }
    } else {
        if (inVisibleIdx >= 0) {
            const item = visibleQueue.splice(inVisibleIdx, 1)[0];
            if (item) hiddenQueue.push(item);
        }
    }
}

function observeBlockElement(block: ContentBlock): void {
    if (!intersectionObserver) initIntersectionObserver();
    intersectionObserver?.observe(block.element);
}

function unobserveBlockElement(block: ContentBlock): void {
    intersectionObserver?.unobserve(block.element);
}

async function processBatchItems(items: readonly BatchItem[]): Promise<void> {
    const batchStartTime = performance.now();
    batchSequence += 1;
    const batchId = `${location.hostname}:${batchSequence}`;
    globalProfiler.startBatch(batchId);

    // Sort items: visible first, then hidden
    const sorted = [...items].sort((a, b) => {
        if (a.isVisible === b.isVisible) return 0;
        return a.isVisible ? -1 : 1;
    });

    if (!isEnabled || sorted.length === 0) return;

    const hashes = sorted.map((item) => ({ id: item.id, text: item.text, hash: item.hash }));
    const filtered = hashes.filter((h) => shouldClassifyText(h.text));
    const skipped = hashes.filter((h) => !shouldClassifyText(h.text));
    const toClassify = hashes.filter((h) => !verdictCache.has(h.hash));
    const cached = hashes.filter((h) => verdictCache.has(h.hash));

    // Apply cached verdicts
    for (const c of cached) {
        const verdict = verdictCache.get(c.hash);
        if (verdict) {
            const block = sorted.find(i => i.id === c.id)?.block;
            if (block && currentAdapter) {
                currentAdapter.applyEnforcement(block.id, verdict);
                if (verdict.isToxic) recordBlockedItem(block.id, verdict, block.text);
            }
            recordClassification();
        }
    }
    updateScannedStats(cached.length + skipped.length);

    if (toClassify.length === 0) return;

    const eligibleToClassify = filtered.filter((h) => !verdictCache.has(h.hash));
    if (eligibleToClassify.length === 0) return;

    const request: DetoxIpcMessage = {
        type: 'classifyBatch',
        items: eligibleToClassify.map((item) => ({ id: item.id, text: item.text })),
        threshold: currentThreshold
    };

    globalProfiler.markStage('tokenizationMs');
    try {
        await new Promise<void>((resolve) => {
            chrome.runtime.sendMessage(request, (response: DetoxIpcMessage | undefined) => {
                globalProfiler.markStage('inferenceMs');
                if (chrome.runtime.lastError) {
                    console.warn('[Detox] classifyBatch runtime error', chrome.runtime.lastError.message);
                    resolve();
                    return;
                }
                if (response?.type === 'classifyBatchResult') {
                    updateScannedStats(response.results.length);
                    let toxicDelta = 0;
                    for (const result of response.results) {
                        const original = eligibleToClassify.find((x) => x.id === result.id);
                        const originalBlock = sorted.find(i => i.id === result.id)?.block;
                        if (!original || !originalBlock) continue;

                        const verdict: Verdict = { isToxic: result.isToxic, score: result.score, label: result.label };
                        verdictCache.set(original.hash, verdict);

                        if (verdict.isToxic) {
                            toxicDelta += 1;
                            if (currentAdapter) {
                                currentAdapter.applyEnforcement(originalBlock.id, verdict);
                                recordBlockedItem(originalBlock.id, verdict, originalBlock.text);
                            }
                        }
                        recordClassification();
                    }
                    updateToxicStats(toxicDelta);
                    const batchDuration = performance.now() - batchStartTime;
                    recordBatchProcessed(batchDuration);
                }
                globalProfiler.markStage('postProcessingMs');
                resolve();
            });
        });
    } finally {
        globalProfiler.endBatch(items.length);
    }
}

function scheduleBatchProcessing(): void {
    if (batchTimeoutId !== null) return;

    // Record current queue depth
    const totalQueueDepth = visibleQueue.length + hiddenQueue.length + pendingBatches.flat().length;
    recordQueueDepth(totalQueueDepth);

    batchTimeoutId = window.setTimeout(async () => {
        batchTimeoutId = null;

        // Prioritize visible items
        const currentBatch: BatchItem[] = [];

        // Fill with visible items first (up to VISIBLE_BATCH_RATIO)
        const visibleTarget = Math.ceil(BATCH_SIZE * VISIBLE_BATCH_RATIO);
        while (currentBatch.length < visibleTarget && visibleQueue.length > 0) {
            const item = visibleQueue.shift();
            if (item) currentBatch.push(item);
        }

        // Fill remaining with hidden items
        while (currentBatch.length < BATCH_SIZE && hiddenQueue.length > 0) {
            const item = hiddenQueue.shift();
            if (item) currentBatch.push(item);
        }

        // If queues are empty, check pending batches
        while (currentBatch.length < BATCH_SIZE && pendingBatches.length > 0) {
            const batch = pendingBatches.shift();
            if (!batch) break;
            for (const item of batch) {
                if (currentBatch.length < BATCH_SIZE) {
                    // Add to appropriate queue based on visibility
                    if (item.isVisible) {
                        visibleQueue.push(item);
                    } else {
                        hiddenQueue.push(item);
                    }
                } else {
                    // Put back into pending
                    if (!pendingBatches[0]) pendingBatches[0] = [];
                    pendingBatches[0].unshift(item);
                }
            }
        }

        if (currentBatch.length > 0) {
            await processBatchItems(currentBatch);
        }

        // Schedule next batch if there are more items
        if (visibleQueue.length > 0 || hiddenQueue.length > 0 || pendingBatches.length > 0) {
            scheduleBatchProcessing();
        }
    }, BATCH_INTERVAL_MS);
}

function handleBlocksAdded(blocks: readonly ContentBlock[]): void {
    if (!isEnabled || blocks.length === 0) return;

    // Determine initial visibility
    const items: BatchItem[] = blocks.map(block => {
        const rect = block.element.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight && rect.bottom > 0;

        // Observe for visibility changes
        observeBlockElement(block);

        return {
            id: block.id,
            text: block.text,
            hash: fnv1a32(block.text),
            block,
            isVisible,
        };
    });

    // Add to appropriate queues based on visibility
    for (const item of items) {
        if (item.isVisible) {
            visibleQueue.push(item);
        } else {
            hiddenQueue.push(item);
        }
    }

    // Schedule processing
    scheduleBatchProcessing();
}

function handleBlocksRemoved(blockIds: readonly string[]): void {
    // Unobserve removed blocks
    for (const id of blockIds) {
        const block = [...visibleQueue, ...hiddenQueue].find(i => i.id === id)?.block;
        if (block) unobserveBlockElement(block);
    }

    // Remove from queues
    for (let i = visibleQueue.length - 1; i >= 0; i -= 1) {
        if (blockIds.includes(visibleQueue[i].id)) {
            visibleQueue.splice(i, 1);
        }
    }
    for (let i = hiddenQueue.length - 1; i >= 0; i -= 1) {
        if (blockIds.includes(hiddenQueue[i].id)) {
            hiddenQueue.splice(i, 1);
        }
    }

    // Remove from pending batches
    for (const batch of pendingBatches) {
        for (let i = batch.length - 1; i >= 0; i -= 1) {
            if (blockIds.includes(batch[i].id)) {
                batch.splice(i, 1);
            }
        }
    }
    // Clean up empty batches
    pendingBatches = pendingBatches.filter(b => b.length > 0);
}

function initAdapter(): void {
    if (!isEnabled) return;

    // Clean up previous adapter
    if (currentAdapter) {
        currentAdapter.destroy();
        currentAdapter = null;
    }
    if (stopObserving) {
        stopObserving();
        stopObserving = null;
    }

    // Get matching adapter
    const adapter = getMatchingAdapter();
    if (!adapter) {
        console.log('[Detox] No adapter found for this site');
        return;
    }

    currentAdapter = adapter;
    console.log(`[Detox] Using adapter: ${adapter.name}`);

    // Start observing
    stopObserving = adapter.observeChanges({
        onBlocksAdded: handleBlocksAdded,
        onBlocksRemoved: handleBlocksRemoved,
        onBlocksUpdated: handleBlocksAdded,
    });
}

// Handle messages from popup for metrics
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'detectLanguage') {
        const htmlLang = document.documentElement.lang?.toLowerCase();
        if (htmlLang) {
            const language = htmlLang.split('-')[0] ?? 'en';
            sendResponse({ language, confidence: 0.9 });
            return true;
        }
        const metaLang = document.querySelector('meta[http-equiv="content-language"]')?.getAttribute('content')?.toLowerCase() ||
                        document.querySelector('meta[name="language"]')?.getAttribute('content')?.toLowerCase();
        if (metaLang) {
            const language = metaLang.split(',')[0]?.trim().split('-')[0] ?? 'en';
            sendResponse({ language, confidence: 0.8 });
            return true;
        }
        const language = navigator.language.split('-')[0] ?? 'en';
        sendResponse({ language, confidence: 0.5 });
        return true;
    }
    if (message.type === 'getPerformanceMetrics') {
        const metrics = {
            firstClassificationTime: perfMetrics.firstClassificationTime,
            totalClassified: perfMetrics.totalClassified,
            totalBatches: perfMetrics.totalBatches,
            averageBatchTime: getAverageBatchTime(),
            throughput: getThroughput(),
            averageQueueDepth: getAverageQueueDepth(),
            currentQueueDepth: visibleQueue.length + hiddenQueue.length + pendingBatches.flat().length,
        };
        sendResponse(metrics);
        return true;
    }
    if (message.type === 'getProfileSummary') {
        sendResponse(globalProfiler.getSummary());
        return true;
    }
    return false;
});

// Listen for messages from test environment (Playwright E2E)
window.addEventListener('message', (event) => {
    if (event.data?.type === 'detoxGetPerfMetrics') {
        const metrics = {
            firstClassificationTime: perfMetrics.firstClassificationTime,
            totalClassified: perfMetrics.totalClassified,
            totalBatches: perfMetrics.totalBatches,
            averageBatchTime: getAverageBatchTime(),
            throughput: getThroughput(),
            averageQueueDepth: getAverageQueueDepth(),
            currentQueueDepth: visibleQueue.length + hiddenQueue.length + pendingBatches.flat().length,
        };
        const profileSummary = globalProfiler.getSummary();
        window.postMessage({ type: 'detoxPerfResponse', payload: { metrics, profileSummary } }, '*');
    }
});
