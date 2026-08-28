/// <reference types="chrome" />
import { globalProfiler } from './v2/core/profiler';
import { ClassificationPipeline } from './core/pipeline/classification-pipeline';
import { revealContentUnit } from './core/enforcement/apply-unit-enforcement';
import { markBlockedItemRevealed } from './core/feedback/reveal-feedback-store';
import { ENFORCEMENT_DATASET, enforcementAttrSelector } from './core/enforcement/element-state';
import { CONTENT_PERF_REQUEST, CONTENT_PERF_RESPONSE } from './core/ipc/content-messages';
import { createScanCoordinator, type ScanCoordinator } from './core/scanner/scan-coordinator';
import { resolveSiteHints, resolveActiveHintPackIds } from './core/scanner/hint-registry';
import { deriveScanStatus, type ScanDiagnosticsSnapshot } from './core/scanner/scan-diagnostics';
import { isModEnabled } from './core/mods/mod-enablement-store';
import { installPolicyLoader } from './core/policy/policy-store';
import { installUserRulesLoader, subscribeToUserRulesChanges, isDomainAllowlisted } from './core/rules/user-rules-store';
import { installEnforcementActionLoader } from './core/registry/action-registry';
import { installFilterAppearanceLoader } from './core/settings/filter-appearance-store';
import { refreshFilterAppearanceStyles } from './core/enforcement/filtered-affordance';
import { subscribeToEnabledModChanges } from './core/mods/mod-enablement-store';
import { subscribeToInstalledModChanges } from './core/mods/installed-mod-store';
import { loadBuiltinMods } from './mods/load-builtin-mods';
import { getBuildProfile } from './build-profile';
import { installAuthenticityContentBridge } from './authenticity/content-bridge';
import { installAssistSelectionToolbar } from './assist/selection-toolbar';
import { initRuntimeLocale, refreshFilteredElementTitles, subscribeRuntimeLocale } from './i18n/runtime-locale';
import { extractPageContext, getSelectionSnapshot } from './authenticity/page-extract';
import { sessionRemove } from './core/storage/extension-session';
import { resetPageScanStats } from './core/storage/scan-stats-store';
import { detectPageLanguage } from './v2/core/language-pack-manager';
import { setAdaptationPageFromUrl, setAdaptationPageLanguage } from './core/adaptation/adaptation-pack-registry';

console.log(`[Core] Content script loading (profile: ${getBuildProfile()})`);

void initRuntimeLocale().then(() => {
    subscribeRuntimeLocale(() => {
        refreshFilteredElementTitles();
    });
});

installAuthenticityContentBridge();
installAssistSelectionToolbar();

let isEnabled = true;
let scanCoordinator: ScanCoordinator | null = null;
let stopObserving: (() => void) | null = null;

const NAVIGATION_POLL_INTERVAL_MS: number = 750;
const NAVIGATION_DEBOUNCE_MS: number = 250;
const SCROLL_RESCAN_DEBOUNCE_MS: number = 400;
const SCROLL_RESCAN_MIN_DELTA_PX: number = 500;

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
    onClassificationRecorded: recordClassification,
    onBatchProcessed: recordBatchProcessed,
    onQueueDepth: recordQueueDepth,
    profiler: globalProfiler,
});

function revealAllFilteredContent(): void {
    document.querySelectorAll<HTMLElement>(enforcementAttrSelector('blocked', 'true')).forEach((el) => {
        const id = el.dataset[ENFORCEMENT_DATASET.blockId];
        revealContentUnit(id ?? '', el);
    });
}

function stopScanner(): void {
    if (stopObserving) {
        stopObserving();
        stopObserving = null;
    }
    scanCoordinator?.stop();
    scanCoordinator = null;
    pipeline.clearQueues();
}

subscribeToUserRulesChanges(() => {
    pipeline.clearCache();
    if (isDomainAllowlisted(location.hostname)) {
        revealAllFilteredContent();
        stopScanner();
    } else if (isEnabled) {
        scheduleRescan();
    }
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
            revealAllFilteredContent();
        } else {
            void ensureModsLoaded().then(() => initScanner());
        }
    }

    const modeSettingsChanged =
        changes.activeBrowsingModeId ||
        changes.policy ||
        changes.userRules ||
        changes.userKeywords ||
        changes.enforcementAction ||
        changes.filterAppearance ||
        changes.enabledModIds;

    if (changes.filterAppearance) {
        refreshFilterAppearanceStyles();
    }

    if (modeSettingsChanged) {
        pipeline.clearCache();
        if (changes.enabledModIds || changes.activeBrowsingModeId) {
            void onModsConfigurationChanged();
        } else if (isEnabled) {
            scheduleRescan();
        }
    }
});

chrome.storage.local.get('enabled', (res: unknown) => {
    const record = res as EnabledStorageRecord;
    isEnabled = record.enabled ?? true;
    void bootstrap();
});

let modsInitialized = false;

async function ensureModsLoaded(): Promise<void> {
    await loadBuiltinMods();
    if (!modsInitialized) {
        installEnforcementActionLoader();
        installFilterAppearanceLoader();
        installPolicyLoader();
        installUserRulesLoader();
        subscribeToEnabledModChanges(() => {
            void onModsConfigurationChanged();
        });
        subscribeToInstalledModChanges(() => {
            void onModsConfigurationChanged();
        });
        modsInitialized = true;
    }
}

async function onModsConfigurationChanged(): Promise<void> {
    await loadBuiltinMods();
    pipeline.clearCache();
    scheduleRescan();
}

async function bootstrap(): Promise<void> {
    await ensureModsLoaded();
    if (!isEnabled) return;
    resetPageState();
    console.log('[Core] Initializing content pipeline...');
    setTimeout(() => requestIdleCallback(initScanner), 500);
}

function getPageKey(): string {
    return `${location.origin}${location.pathname}${location.search}`;
}

function resetPageState(): void {
    if (stopObserving) {
        stopObserving();
        stopObserving = null;
    }
    scanCoordinator?.stop();
    scanCoordinator = null;
    pipeline.clearCache();
    pipeline.clearQueues();
    void resetPageScanStats(getPageKey());
    resetPerfMetrics();
    lastScrollRescanY = window.scrollY;
    lastPageKey = getPageKey();
}

function scheduleRescan(): void {
    if (!isEnabled) return;
    void ensureModsLoaded().then(() => {
        setTimeout(() => requestIdleCallback(initScanner), 500);
    });
}

function onNavigationMaybeChanged(): void {
    const key = getPageKey();
    if (lastPageKey === null) {
        lastPageKey = key;
        return;
    }
    if (key === lastPageKey) return;
    void sessionRemove('blockedItems');
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

let scrollRescanTimerId: number | null = null;
let lastScrollRescanY = 0;

function requestProgressiveRescan(immediate = false): void {
    if (!isEnabled) return;
    scanCoordinator?.rescan();
    if (pipeline.getQueueDepth() > 0) {
        pipeline.kickProgressiveScan(immediate);
    }
}

window.addEventListener('scroll', () => {
    const delta = Math.abs(window.scrollY - lastScrollRescanY);
    if (delta < SCROLL_RESCAN_MIN_DELTA_PX) return;
    if (scrollRescanTimerId !== null) return;
    scrollRescanTimerId = window.setTimeout(() => {
        scrollRescanTimerId = null;
        lastScrollRescanY = window.scrollY;
        requestProgressiveRescan();
    }, SCROLL_RESCAN_DEBOUNCE_MS);
}, { passive: true });

function initScanner(): void {
    if (!isEnabled) return;

    const pageLang = detectPageLanguage().primary;
    setAdaptationPageLanguage(pageLang);
    setAdaptationPageFromUrl(location.href);

    if (isDomainAllowlisted(location.hostname)) {
        stopScanner();
        revealAllFilteredContent();
        console.log('[Core] Site whitelisted — scanner disabled on this page');
        return;
    }

    if (stopObserving) {
        stopObserving();
        stopObserving = null;
    }
    scanCoordinator?.stop();
    scanCoordinator = null;

    console.log('[Core] Using universal scanner');

    scanCoordinator = createScanCoordinator(document, {
        onAdded: (units) => {
            pipeline.handleUnitsAdded(units);
            pipeline.kickProgressiveScan(true);
        },
        onUpdated: (units) => {
            pipeline.handleUnitsUpdated(units);
        },
    }, {
        getHints: () => resolveSiteHints(location.hostname, isModEnabled),
    });

    scanCoordinator.start();
    stopObserving = () => {
        scanCoordinator?.stop();
        scanCoordinator = null;
    };

    pipeline.kickProgressiveScan(true);
}

function collectScanDiagnostics(): ScanDiagnosticsSnapshot {
    const nowMs = Date.now();
    const progress = pipeline.getScanProgress();
    const coordinator = scanCoordinator?.getDiagnostics() ?? null;

    return {
        discoveryMode: scanCoordinator ? 'universal' : 'none',
        adapterId: null,
        activeHintPacks: resolveActiveHintPackIds(location.hostname, isModEnabled),
        pageKey: getPageKey(),
        coordinator,
        queue: {
            pending: progress.pending,
            done: progress.done,
            total: progress.total,
            depth: pipeline.getQueueDepth(),
        },
        performance: {
            totalClassified: perfMetrics.totalClassified,
            firstClassificationMs: perfMetrics.firstClassificationTime,
        },
        status: deriveScanStatus({
            enabled: isEnabled,
            pendingRescan: coordinator?.pendingRescan ?? false,
            queuePending: progress.pending,
            queueDepth: pipeline.getQueueDepth(),
            lastScanAtMs: coordinator?.lastScanAtMs ?? null,
            nowMs,
        }),
        collectedAtMs: nowMs,
    };
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
    if (message.type === 'getScanDiagnostics') {
        sendResponse(collectScanDiagnostics());
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
    if (message.type === 'authenticity:getPageContext') {
        sendResponse(extractPageContext());
        return true;
    }
    if (message.type === 'authenticity:getSelection') {
        sendResponse(getSelectionSnapshot());
        return true;
    }
    if (message.type === 'revealBlockedUnit') {
        const unitId = typeof message.unitId === 'string' ? message.unitId : '';
        if (unitId) {
            const target = document.querySelector<HTMLElement>(
                enforcementAttrSelector('blockId', unitId)
            );
            revealContentUnit(unitId, target);
            void markBlockedItemRevealed(unitId);
            target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            sendResponse({ ok: true });
        } else {
            sendResponse({ ok: false });
        }
        return true;
    }
    return false;
});

window.addEventListener('message', (event) => {
    if (event.data?.type === CONTENT_PERF_REQUEST) {
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
        window.postMessage({ type: CONTENT_PERF_RESPONSE, payload: { metrics, profileSummary } }, '*');
    }
});
