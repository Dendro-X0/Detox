/// <reference types="chrome" />
import type { SiteAdapter } from './site-adapters/adapter-interface';
import { getMatchingAdapter } from './site-adapters/adapter-interface';
import { globalProfiler } from './v2/core/profiler';
import { ClassificationPipeline } from './core/pipeline/classification-pipeline';
import { installPolicyLoader } from './core/policy/policy-store';
import { installEnforcementActionLoader } from './core/registry/action-registry';
import { loadBuiltinMods } from './mods/load-builtin-mods';
import { getBuildProfile } from './build-profile';

console.log(`[Core] Content script loading (profile: ${getBuildProfile()})`);

let isEnabled = true;
let currentAdapter: SiteAdapter | null = null;
let stopObserving: (() => void) | null = null;

const NAVIGATION_POLL_INTERVAL_MS: number = 750;
const NAVIGATION_DEBOUNCE_MS: number = 250;

type EnabledStorageRecord = {
    readonly enabled?: boolean;
};

let lastPageKey: string | null = null;
let navigationDebounceTimerId: number | null = null;

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
        console.log(`[Core] Time to first classification: ${perfMetrics.firstClassificationTime.toFixed(1)}ms`);
    }
}

function recordBatchProcessed(durationMs: number): void {
    perfMetrics.totalBatches += 1;
    perfMetrics.totalBatchTime += durationMs;
}

function recordQueueDepth(depth: number): void {
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
    return (perfMetrics.totalClassified / elapsed) * 1000;
}

const pipeline = new ClassificationPipeline({
    isEnabled: () => isEnabled,
    getAdapter: () => currentAdapter,
    onClassificationRecorded: recordClassification,
    onBatchProcessed: recordBatchProcessed,
    onQueueDepth: recordQueueDepth,
    profiler: globalProfiler,
});

function requestNavigationCheck(): void {
    if (navigationDebounceTimerId !== null) return;
    navigationDebounceTimerId = window.setTimeout(() => {
        navigationDebounceTimerId = null;
        onNavigationMaybeChanged();
    }, NAVIGATION_DEBOUNCE_MS);
}

chrome.storage.onChanged.addListener((changes) => {
    if (changes.enabled) {
        isEnabled = changes.enabled.newValue as boolean;
        if (!isEnabled) {
            document.querySelectorAll<HTMLElement>('[data-detox-blocked="true"]').forEach((el) => {
                if (currentAdapter) {
                    const id = el.dataset.detoxId;
                    if (id) currentAdapter.revealBlock(id);
                }
            });
        } else {
            void ensureModsLoaded().then(() => initAdapter());
        }
    }
});

chrome.storage.local.get('enabled', (res: unknown) => {
    const record = res as EnabledStorageRecord;
    isEnabled = record.enabled ?? true;
    void bootstrap();
});

let modsReady = false;
let modsLoadPromise: Promise<void> | null = null;

async function ensureModsLoaded(): Promise<void> {
    if (modsReady) return;
    if (!modsLoadPromise) {
        modsLoadPromise = loadBuiltinMods().then(() => {
            installEnforcementActionLoader();
            installPolicyLoader();
            modsReady = true;
        });
    }
    await modsLoadPromise;
}

async function bootstrap(): Promise<void> {
    await ensureModsLoaded();
    if (!isEnabled) return;
    resetPageState();
    console.log('[Core] Initializing content pipeline...');
    chrome.storage.session.remove('blockedItems');
    setTimeout(() => requestIdleCallback(initAdapter), 2000);
}

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
    pipeline.clearCache();
    pipeline.clearQueues();
    resetStats();
    resetPerfMetrics();
    lastPageKey = getPageKey();
}

function scheduleRescan(): void {
    if (!isEnabled) return;
    void ensureModsLoaded().then(() => {
        setTimeout(() => requestIdleCallback(initAdapter), 500);
    });
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

function initAdapter(): void {
    if (!isEnabled) return;

    if (currentAdapter) {
        currentAdapter.destroy();
        currentAdapter = null;
    }
    if (stopObserving) {
        stopObserving();
        stopObserving = null;
    }

    const adapter = getMatchingAdapter();
    if (!adapter) {
        console.log('[Core] No adapter found for this site');
        return;
    }

    currentAdapter = adapter;
    console.log(`[Core] Using adapter: ${adapter.name}`);

    stopObserving = adapter.observeChanges({
        onBlocksAdded: (blocks) => pipeline.handleBlocksAdded(blocks),
        onBlocksRemoved: (blockIds) => pipeline.handleBlocksRemoved(blockIds),
        onBlocksUpdated: (blocks) => pipeline.handleBlocksAdded(blocks),
    });
}

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
        sendResponse({
            firstClassificationTime: perfMetrics.firstClassificationTime,
            totalClassified: perfMetrics.totalClassified,
            totalBatches: perfMetrics.totalBatches,
            averageBatchTime: getAverageBatchTime(),
            throughput: getThroughput(),
            averageQueueDepth: getAverageQueueDepth(),
            currentQueueDepth: pipeline.getQueueDepth(),
        });
        return true;
    }
    if (message.type === 'getProfileSummary') {
        sendResponse(globalProfiler.getSummary());
        return true;
    }
    return false;
});

window.addEventListener('message', (event) => {
    if (event.data?.type === 'detoxGetPerfMetrics') {
        const metrics = {
            firstClassificationTime: perfMetrics.firstClassificationTime,
            totalClassified: perfMetrics.totalClassified,
            totalBatches: perfMetrics.totalBatches,
            averageBatchTime: getAverageBatchTime(),
            throughput: getThroughput(),
            averageQueueDepth: getAverageQueueDepth(),
            currentQueueDepth: pipeline.getQueueDepth(),
        };
        const profileSummary = globalProfiler.getSummary();
        window.postMessage({ type: 'detoxPerfResponse', payload: { metrics, profileSummary } }, '*');
    }
});
