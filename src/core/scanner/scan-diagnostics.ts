/** Live scanner/coordinator state for the popup diagnostics panel. */
export type ScanCoordinatorDiagnostics = {
    readonly active: boolean;
    readonly sessionFingerprints: number;
    readonly snapshotUnits: number;
    readonly scanCycles: number;
    readonly lastScanAtMs: number | null;
    readonly lastAdded: number;
    readonly lastUpdated: number;
    readonly pendingRescan: boolean;
};

export type ScanDiagnosticsSnapshot = {
    readonly discoveryMode: 'universal' | 'none';
    readonly adapterId: null;
    readonly activeHintPacks: readonly string[];
    readonly pageKey: string;
    readonly coordinator: ScanCoordinatorDiagnostics | null;
    readonly queue: {
        readonly pending: number;
        readonly done: number;
        readonly total: number;
        readonly depth: number;
    };
    readonly performance: {
        readonly totalClassified: number;
        readonly firstClassificationMs: number | null;
    };
    readonly status: 'scanning' | 'idle' | 'plateau' | 'disabled';
    readonly collectedAtMs: number;
};

export const SCAN_PLATEAU_IDLE_MS = 30_000;

export function deriveScanStatus(input: {
    readonly enabled: boolean;
    readonly pendingRescan: boolean;
    readonly queuePending: number;
    readonly queueDepth: number;
    readonly lastScanAtMs: number | null;
    readonly nowMs: number;
}): ScanDiagnosticsSnapshot['status'] {
    if (!input.enabled) return 'disabled';

    const activelyWorking =
        input.pendingRescan || input.queuePending > 0 || input.queueDepth > 0;
    if (activelyWorking) return 'scanning';

    if (
        input.lastScanAtMs !== null &&
        input.nowMs - input.lastScanAtMs >= SCAN_PLATEAU_IDLE_MS
    ) {
        return 'plateau';
    }

    return 'idle';
}

export function formatScanStatusLabel(status: ScanDiagnosticsSnapshot['status']): string {
    switch (status) {
        case 'scanning':
            return 'Scanning';
        case 'plateau':
            return 'Plateau (idle)';
        case 'idle':
            return 'Idle';
        case 'disabled':
            return 'Disabled';
    }
}

export function formatRelativeTimeMs(timestampMs: number | null, nowMs: number): string {
    if (timestampMs === null) return 'never';
    const deltaSec = Math.max(0, Math.round((nowMs - timestampMs) / 1000));
    if (deltaSec < 5) return 'just now';
    if (deltaSec < 60) return `${deltaSec}s ago`;
    const minutes = Math.floor(deltaSec / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
}
