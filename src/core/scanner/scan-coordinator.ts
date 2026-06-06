import type { ContentUnit, ScanRoot } from './content-unit';
import { isExpandInteractionTarget } from './expand-triggers';
import { scanDiff } from './scan-diff';
import type { ScanCoordinatorDiagnostics } from './scan-diagnostics';
import type { SiteScanHints } from './site-hints';
import { scanUniversal } from './universal-scanner';

const DEFAULT_DEBOUNCE_MS = 100;
const EXPAND_DEBOUNCE_MS = 150;
const IDLE_TIMEOUT_MS = 120;
const FALLBACK_IDLE_MS = 16;
const NEARBY_MARGIN_PX = 200;

export type ScanCoordinatorCallbacks = {
    readonly onAdded: (units: readonly ContentUnit[]) => void;
    readonly onUpdated?: (units: readonly ContentUnit[]) => void;
};

export type ScanCoordinatorOptions = {
    readonly debounceMs?: number;
    readonly observeMutations?: boolean;
    readonly getHints?: () => SiteScanHints | null;
};

export type ScanCoordinator = {
    readonly start: () => void;
    readonly stop: () => void;
    /** Run an immediate scan cycle (bypasses debounce). */
    readonly rescan: () => void;
    /** Wait for any pending debounced scan to finish. */
    readonly flush: () => void;
    readonly getSessionSeenIds: () => ReadonlySet<string>;
    readonly getDiagnostics: () => ScanCoordinatorDiagnostics;
};

function scheduleIdle(work: () => void): void {
    if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(work, { timeout: IDLE_TIMEOUT_MS });
        return;
    }
    globalThis.setTimeout(work, FALLBACK_IDLE_MS);
}

function isLikelyVisible(element: HTMLElement): boolean {
    const view = element.ownerDocument.defaultView;
    if (!view) return true;

    const rect = element.getBoundingClientRect();
    const viewportHeight = view.innerHeight || view.document.documentElement.clientHeight;
    return rect.bottom > -NEARBY_MARGIN_PX && rect.top < viewportHeight + NEARBY_MARGIN_PX;
}

function sortByVisibility(
    units: readonly ContentUnit[],
    visibility: ReadonlyMap<string, boolean>
): ContentUnit[] {
    const priority = (unit: ContentUnit): number => {
        const observed = visibility.get(unit.id);
        if (observed === true) return 0;
        if (observed === false) return 2;
        return isLikelyVisible(unit.element) ? 1 : 2;
    };

    return [...units].sort((left, right) => priority(left) - priority(right));
}

function observeRootNode(root: ScanRoot): Node {
    if ('nodeType' in root && root.nodeType === Node.DOCUMENT_NODE) {
        const document = root as Document;
        return document.body ?? document.documentElement;
    }
    return root;
}

function ownerDocument(root: ScanRoot): Document {
    if ('nodeType' in root && root.nodeType === Node.DOCUMENT_NODE) {
        return root as Document;
    }
    const node = root as Node;
    return node.ownerDocument ?? (node as unknown as Document);
}

export function createScanCoordinator(
    root: ScanRoot,
    callbacks: ScanCoordinatorCallbacks,
    options: ScanCoordinatorOptions = {}
): ScanCoordinator {
    const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
    const observeMutations = options.observeMutations ?? true;
    const observeTarget = observeRootNode(root);

    let snapshot: ContentUnit[] = [];
    const sessionSeen = new Set<string>();
    const visibility = new Map<string, boolean>();

    let mutationObserver: MutationObserver | null = null;
    let intersectionObserver: IntersectionObserver | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let idleScheduled = false;
    let started = false;
    let scanCycles = 0;
    let lastScanAtMs: number | null = null;
    let lastAdded = 0;
    let lastUpdated = 0;
    let expandClickHandler: ((event: Event) => void) | null = null;
    const documentRef = ownerDocument(root);

    function observeUnitElements(units: readonly ContentUnit[]): void {
        if (!intersectionObserver) return;
        for (const unit of units) {
            intersectionObserver.observe(unit.element);
        }
    }

    function runScanCycle(): void {
        idleScheduled = false;
        const hints = options.getHints?.() ?? null;
        const next = [...scanUniversal(root, hints)];
        const diff = scanDiff(snapshot, next);

        const unseenAdded = diff.added.filter((unit) => !sessionSeen.has(unit.id));
        for (const unit of unseenAdded) {
            sessionSeen.add(unit.id);
        }

        const prioritizedAdded = sortByVisibility(unseenAdded, visibility);
        if (prioritizedAdded.length > 0) {
            callbacks.onAdded(prioritizedAdded);
            observeUnitElements(prioritizedAdded);
        }

        if (diff.updated.length > 0) {
            callbacks.onUpdated?.(diff.updated);
            observeUnitElements(diff.updated);
        }

        snapshot = next;
        scanCycles += 1;
        lastScanAtMs = Date.now();
        lastAdded = unseenAdded.length;
        lastUpdated = diff.updated.length;
    }

    function scheduleScan(debounceOverrideMs?: number): void {
        if (!started) return;
        if (debounceTimer) {
            clearTimeout(debounceTimer);
        }
        const waitMs = debounceOverrideMs ?? debounceMs;
        debounceTimer = setTimeout(() => {
            debounceTimer = null;
            if (idleScheduled) return;
            idleScheduled = true;
            scheduleIdle(runScanCycle);
        }, waitMs);
    }

    function handleExpandInteraction(event: Event): void {
        if (!isExpandInteractionTarget(event.target)) return;
        scheduleScan(EXPAND_DEBOUNCE_MS);
    }

    function rescan(): void {
        if (debounceTimer) {
            clearTimeout(debounceTimer);
            debounceTimer = null;
        }
        idleScheduled = false;
        runScanCycle();
    }

    function flush(): void {
        if (debounceTimer) {
            clearTimeout(debounceTimer);
            debounceTimer = null;
        }
        if (idleScheduled) {
            runScanCycle();
            return;
        }
        rescan();
    }

    function start(): void {
        if (started) return;
        started = true;

        intersectionObserver = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    const element = entry.target as HTMLElement;
                    const unit = snapshot.find((candidate) => candidate.element === element);
                    if (!unit) continue;
                    visibility.set(unit.id, entry.isIntersecting);
                }
            },
            {
                root: null,
                rootMargin: `${NEARBY_MARGIN_PX}px`,
                threshold: 0,
            }
        );

        if (observeMutations) {
            mutationObserver = new MutationObserver(() => {
                scheduleScan();
            });
            mutationObserver.observe(observeTarget, {
                childList: true,
                subtree: true,
                characterData: true,
                attributes: true,
                attributeFilter: ['aria-expanded', 'hidden', 'class', 'open'],
            });
        }

        expandClickHandler = handleExpandInteraction;
        documentRef.addEventListener('click', expandClickHandler, true);

        rescan();
    }

    function stop(): void {
        started = false;
        if (expandClickHandler) {
            documentRef.removeEventListener('click', expandClickHandler, true);
            expandClickHandler = null;
        }
        if (debounceTimer) {
            clearTimeout(debounceTimer);
            debounceTimer = null;
        }
        idleScheduled = false;
        mutationObserver?.disconnect();
        mutationObserver = null;
        intersectionObserver?.disconnect();
        intersectionObserver = null;
        snapshot = [];
        visibility.clear();
        scanCycles = 0;
        lastScanAtMs = null;
        lastAdded = 0;
        lastUpdated = 0;
    }

    function getDiagnostics(): ScanCoordinatorDiagnostics {
        return {
            active: started,
            sessionFingerprints: sessionSeen.size,
            snapshotUnits: snapshot.length,
            scanCycles,
            lastScanAtMs,
            lastAdded,
            lastUpdated,
            pendingRescan: debounceTimer !== null || idleScheduled,
        };
    }

    return {
        start,
        stop,
        rescan,
        flush,
        getSessionSeenIds: () => sessionSeen,
        getDiagnostics,
    };
}
